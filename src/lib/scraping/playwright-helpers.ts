import { chromium, type Browser, type Page } from 'playwright';
import { withRetry } from '@/lib/utils/retry';

let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
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

  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

export async function safeNavigate(page: Page, url: string): Promise<boolean> {
  try {
    await withRetry(
      () => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }),
      2,
      2000
    );
    return true;
  } catch {
    return false;
  }
}
