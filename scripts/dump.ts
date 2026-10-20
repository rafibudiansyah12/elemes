import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page, type Response } from "playwright";

const origin = "https://lms.unindra.ac.id";
const rawDir = path.resolve("data/raw");
const urlsFile = path.resolve("scripts/urls.json");
const suggestedFile = path.resolve("scripts/urls.suggested.json");
const reportFile = path.join(rawDir, "_report.md");
const sessionExpiredMessage = "Sesi habis, jalankan: npm run login";

type PageInput = { name: string; url: string };
type Endpoint = { url: string; method: string; status: number; file?: string };
type LinkInfo = { text: string; href: string };
type PageReport = {
  name: string;
  requestedUrl: string;
  finalUrl: string;
  title: string;
  tables: number;
  forms: number;
  httpStatus?: number;
  links: LinkInfo[];
  endpoints: Endpoint[];
  error?: string;
};

function safeName(value: string): string {
  return value.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "halaman";
}

function scrubUrl(value: string): string {
  try {
    const url = new URL(value);
    // Mask identifier opak pada URL halaman LMS saat dicatat.
    url.pathname = url.pathname.replace(/(\/pertemuan\/pke\/)[^/]+/i, "$1[REDACTED]");
    url.pathname = url.pathname.replace(/(\/pertemuan\/plist\/)[^/]+/i, "$1[REDACTED]");
    url.pathname = url.pathname.replace(/(\/member_tugas\/kelas\/)[^/]+/i, "$1[REDACTED]");
    for (const key of [...url.searchParams.keys()]) {
      if (/csrf|token|auth|session|password|secret/i.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return url.toString();
  } catch {
    return value;
  }
}

function redactHtml(html: string): string {
  // Hapus nilai kredensial/CSRF yang mungkin ditanam di input atau meta tag.
  return html
    .replace(/<input\b[^>]*>/gi, (tag) => {
      const key = tag.match(/\b(?:name|id)\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
      const hidden = /\btype\s*=\s*["']hidden["']/i.test(tag);
      return hidden || /csrf|token|password|secret|auth/i.test(key)
        ? tag.replace(/(\bvalue\s*=\s*)(["']).*?\2/i, '$1"[REDACTED]"')
        : tag;
    })
    .replace(/<meta\b[^>]*>/gi, (tag) => /\b(?:name|property)\s*=\s*["'][^"']*(?:csrf|token)[^"']*["']/i.test(tag)
      ? tag.replace(/(\bcontent\s*=\s*)(["']).*?\2/i, '$1"[REDACTED]"') : tag)
    .replace(/(["']?(?:csrf[_-]?token|xsrf[_-]?token|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["'])[^"']*(["'])/gi, "$1[REDACTED]$2");
}

function redactJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /csrf|token|authorization|password|cookie|secret/i.test(key) ? "[REDACTED]" : redactJson(item),
    ]));
  }
  return value;
}

function isLoginUrl(value: string): boolean {
  return /login/i.test(new URL(value).pathname);
}

function isSafeInternalUrl(href: string): boolean {
  try {
    const url = new URL(href, origin);
    return url.origin === origin && !/logout|log-out|signout|delete|hapus|submit|save|simpan|update|edit|create|add|tambah|remove|send|kirim|enroll|unenroll/i.test(`${url.pathname}?${url.search}`);
  } catch {
    return false;
  }
}

async function readPageInputs(file = urlsFile): Promise<PageInput[]> {
  const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("scripts/urls.json harus berisi array objek { name, url }.");
  const result: PageInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item.name !== "string" || typeof item.url !== "string") {
      throw new Error("Setiap entri scripts/urls.json harus memiliki name dan url berupa teks.");
    }
    const url = new URL(item.url);
    if (url.origin !== origin) throw new Error(`URL harus berasal dari ${origin}: ${item.url}`);
    result.push({ name: safeName(item.name), url: url.toString() });
  }
  return result;
}

async function collectLinks(page: Page): Promise<LinkInfo[]> {
  return page.locator("a[href]").evaluateAll((anchors) => {
    const found: LinkInfo[] = [];
    for (const anchor of anchors) {
      const element = anchor as HTMLAnchorElement;
      const text = (element.innerText || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
      const href = element.href;
      if (text && href) found.push({ text, href });
    }
    return found;
  });
}

async function inspectPage(page: Page, input: PageInput, index: number): Promise<PageReport> {
  const base = path.join(rawDir, safeName(input.name));
  const endpoints: Endpoint[] = [];
  const pendingWrites: Promise<void>[] = [];
  let sessionExpired = false;
  let httpStatus: number | undefined;

  const onResponse = (response: Response) => {
    const request = response.request();
    if (!(["xhr", "fetch"].includes(request.resourceType()))) return;
    const headers = response.headers();
    const contentType = headers["content-type"] || "";
    if (!/\bjson\b/i.test(contentType)) return;

    const endpoint: Endpoint = {
      url: scrubUrl(response.url()),
      method: request.method(),
      status: response.status(),
    };
    endpoints.push(endpoint);
    const number = endpoints.length;
    endpoint.file = `${path.basename(base)}.xhr-${number}.json`;
    pendingWrites.push((async () => {
      try {
        const body: unknown = await response.json();
        await writeFile(path.join(rawDir, endpoint.file!), `${JSON.stringify(redactJson(body), null, 2)}\n`, "utf8");
      } catch {
        // Endpoint tetap tercatat walau body tidak dapat dibaca atau bukan JSON valid.
        delete endpoint.file;
      }
    })());
  };

  page.on("response", onResponse);
  let navigationError: string | undefined;
  try {
    try {
      const response = await page.goto(input.url, { waitUntil: "networkidle", timeout: 60_000 });
      httpStatus = response?.status();
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
      // Timeout/404 dicatat per halaman; coba simpan DOM yang sempat termuat.
    }

    if (isLoginUrl(page.url())) {
      sessionExpired = true;
      throw new Error(sessionExpiredMessage);
    }

    await Promise.allSettled(pendingWrites);
    const finalUrl = page.url();
    const title = await page.title().catch(() => "");
    const links = await collectLinks(page).catch(() => []);
    const metrics = await page.evaluate(() => ({ tables: document.querySelectorAll("table").length, forms: document.querySelectorAll("form").length })).catch(() => ({ tables: 0, forms: 0 }));
    const html = await page.content().catch(() => "");
    if (html) await writeFile(`${base}.html`, redactHtml(html), "utf8");
    await page.screenshot({ path: `${base}.png`, fullPage: true, timeout: 30_000 }).catch(() => undefined);

    return {
      name: input.name,
      requestedUrl: input.url,
      finalUrl,
      title,
      ...metrics,
      httpStatus,
      links: links.filter((link) => isSafeInternalUrl(link.href)).map((link) => ({ ...link, href: scrubUrl(link.href) })),
      endpoints,
      error: navigationError,
    };
  } catch (error) {
    if (sessionExpired) throw error;
    return {
      name: input.name, requestedUrl: input.url, finalUrl: page.url(), title: "", tables: 0, forms: 0, httpStatus,
      links: [], endpoints, error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    page.off("response", onResponse);
    await Promise.allSettled(pendingWrites);
    // Mencegah response handler tertinggal bila body JSON masih disimpan.
    void index;
  }
}

async function crawlNav(): Promise<PageInput[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: "auth.json" });
    const page = await context.newPage();
    await page.route("**/*", (route) => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort());
    try {
      await page.goto(`${origin}/member`, { waitUntil: "networkidle", timeout: 60_000 });
    } catch (error) {
      if (isLoginUrl(page.url())) throw new Error(sessionExpiredMessage);
      throw error;
    }
    if (isLoginUrl(page.url())) throw new Error(sessionExpiredMessage);
    const links = await collectLinks(page);
    const suggestions: PageInput[] = [];
    const seen = new Set<string>();
    for (const link of links) {
      if (!isSafeInternalUrl(link.href)) continue;
      const url = new URL(link.href);
      if (url.pathname === "/member" || seen.has(url.href)) continue;
      // Utamakan link di nav/sidebar/menu; jika markup tidak memakai nav, semua link internal aman dicatat.
      const isNavigation = await page.locator("a[href]").evaluateAll((anchors, target) => {
        const el = anchors.find((anchor) => (anchor as HTMLAnchorElement).href === target) as HTMLAnchorElement | undefined;
        return Boolean(el?.closest("nav, [role=navigation], aside, .sidebar, .navbar, .menu"));
      }, link.href).catch(() => false);
      if (!isNavigation) continue;
      seen.add(url.href);
      suggestions.push({ name: safeName(url.pathname.split("/").filter(Boolean).join("-") || link.text), url: url.href });
    }
    await writeFile(suggestedFile, `${JSON.stringify(suggestions, null, 2)}\n`, "utf8");
    console.log(`Daftar saran tersimpan: ${suggestedFile} (${suggestions.length} link).`);
    return suggestions;
  } finally {
    await browser.close();
  }
}

function makeReport(reports: PageReport[]): string {
  const lines = ["# Laporan discovery LMS", "", `Dibuat: ${new Date().toISOString()}`, ""];
  for (const item of reports) {
    lines.push(`## ${item.name}`, "", `- URL diminta: ${scrubUrl(item.requestedUrl)}`, `- URL akhir: ${scrubUrl(item.finalUrl)}`, `- Status HTTP: ${item.httpStatus ?? "tidak tersedia"}`, `- Judul: ${item.title || "(tidak tersedia)"}`, `- Tabel: ${item.tables}`, `- Form: ${item.forms}`);
    if (item.error) lines.push(`- Error: ${item.error.replace(/[\r\n]+/g, " ")}`);
    lines.push("", "### Link navigasi internal", "");
    if (item.links.length) item.links.forEach((link) => lines.push(`- ${link.text.replace(/[\r\n]+/g, " ")} — ${link.href}`));
    else lines.push("- Tidak ditemukan");
    lines.push("", "### Endpoint XHR/fetch JSON", "");
    if (item.endpoints.length) item.endpoints.forEach((entry) => lines.push(`- ${entry.method} ${entry.url} — status ${entry.status}${entry.file ? ` — file: ${entry.file}` : " — body tidak tersimpan"}`));
    else lines.push("- Tidak ditemukan");
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  const crawl = process.argv.includes("--crawl-nav");
  if (crawl) {
    await crawlNav();
    return;
  }
  const urlsFileFlag = process.argv.indexOf("--urls-file");
  const inputFile = urlsFileFlag >= 0 ? path.resolve(process.argv[urlsFileFlag + 1] || "") : urlsFile;
  const inputs = await readPageInputs(inputFile);
  if (!inputs.length) {
    console.log("Tidak ada URL untuk diproses.");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const reports: PageReport[] = [];
  try {
    const context = await browser.newContext({ storageState: "auth.json" });
    // Batasi trafik browser pada GET/HEAD agar halaman tidak dapat mengirim aksi mutasi.
    await context.route("**/*", (route) => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort());
    const page = await context.newPage();
    for (let i = 0; i < inputs.length; i++) {
      const item = inputs[i];
      console.log(`[${i + 1}/${inputs.length}] Membuka ${scrubUrl(item.url)}`);
      const report = await inspectPage(page, item, i);
      reports.push(report);
      if (isLoginUrl(page.url())) throw new Error(sessionExpiredMessage);
      if (i < inputs.length - 1) await new Promise((resolve) => setTimeout(resolve, 1000 + Math.floor(Math.random() * 1001)));
    }
  } finally {
    await browser.close();
  }
  await writeFile(reportFile, makeReport(reports), "utf8");
  console.log(`Discovery selesai. Laporan: ${reportFile}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message === sessionExpiredMessage ? message : `Discovery gagal: ${message}`);
  process.exitCode = 1;
});
