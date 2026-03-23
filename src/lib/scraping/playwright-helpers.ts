import { chromium, type Browser, type Page } from 'playwright';
import { withRetry } from '@/lib/utils/retry';

let _browser: Browser | null = null;
let _launchPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;
  // Serialize concurrent launch requests — only one chromium.launch() at a time.
  // Without this, 3 parallel crawls all see _browser===null and each launches a browser.
  if (!_launchPromise) {
    _launchPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }).then(b => {
      _browser = b;
      _launchPromise = null;
      return b;
    }).catch(err => {
      _launchPromise = null;
      throw err;
    });
  }
  return _launchPromise;
}

export async function closeBrowser(): Promise<void> {
  _launchPromise = null;
  if (_browser) {
    const b = _browser;
    _browser = null;
    await b.close().catch(() => {});
  }
}

export async function withPage<T>(
  fn: (page: Page) => Promise<T>,
  options?: { timeout?: number }
): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  page.setDefaultTimeout(options?.timeout ?? 20000);

  // Stealth: remove webdriver flag
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // HARD TIMEOUT: page.evaluate() ignores setDefaultTimeout and hangs forever.
  // The only way to abort it is to actually close the page.
  // This timer closes the page after the hard limit, which causes all pending
  // page.evaluate() / page.goto() calls to throw, unblocking the loop.
  const HARD_TIMEOUT_MS = 60000; // 60s absolute max per page
  const hardTimer = setTimeout(() => {
    page.close().catch(() => {});
  }, HARD_TIMEOUT_MS);

  try {
    return await fn(page);
  } finally {
    clearTimeout(hardTimer);
    await page.close().catch(() => {});
  }
}

export async function safeNavigate(page: Page, url: string): Promise<boolean> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}
