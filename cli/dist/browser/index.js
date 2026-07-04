/**
 * SWACANA — Browser Integration Module
 *
 * Uses Playwright to capture web page content from Chrome/Chromium.
 * Playwright is already installed as a dependency (free, open source).
 *
 * Strategy:
 * 1. Use Playwright's chromium to launch or connect to Chrome
 * 2. Capture active tab content or navigate to a specific URL
 * 3. Fallback gracefully if Chrome is not found
 *
 * 100% free, no API keys.
 */
import { chromium } from 'playwright';
import { access } from 'node:fs/promises';
// ─── State ─────────────────────────────────────────────────────────────────
let _browser = null;
// ─── Common Chrome Paths ──────────────────────────────────────────────────
const CHROME_PATHS = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
];
// ─── Check Chrome Availability ────────────────────────────────────────────
export async function checkChrome() {
    // Playwright ships with its own Chromium — assume available if package is installed
    // We don't call executablePath() because it's a method that launches a discovery process
    try {
        // Quick check: can we launch a headless browser?
        const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        await browser.close();
        return { available: true, path: 'chromium (playwright)' };
    }
    catch {
        // Fall through to checking system paths
    }
    // Check common system paths
    for (const rawPath of CHROME_PATHS) {
        const resolved = rawPath.replace('%USERNAME%', process.env.USERNAME || '');
        try {
            await access(resolved);
            return { available: true, path: resolved };
        }
        catch { /* not found */ }
    }
    return { available: false };
}
// ─── Launch or Connect to Browser ─────────────────────────────────────────
async function getBrowser() {
    if (_browser)
        return _browser;
    // Try connecting to existing Chrome instance (debug port)
    try {
        _browser = await chromium.connectOverCDP('http://localhost:9222');
        return _browser;
    }
    catch {
        // Chrome not running with debug port, launch new instance
    }
    // Launch new browser instance
    _browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    return _browser;
}
// ─── Get Active Tab Content ────────────────────────────────────────────────
export async function getActiveTabContent() {
    try {
        const browser = await getBrowser();
        const pages = browser.contexts()[0]?.pages() || [];
        if (pages.length === 0) {
            // No existing pages, open a new blank one
            const page = await browser.newPage();
            return { title: '(blank page)', url: 'about:blank', content: '' };
        }
        // Get the last active page (most recently used)
        const activePage = pages[pages.length - 1];
        const title = await activePage.title();
        const url = activePage.url();
        // Extract text content (limit to 10000 chars)
        const content = await activePage.evaluate(() => {
            const main = document.querySelector('main') || document.querySelector('article') || document.body;
            return main?.innerText?.slice(0, 10000) || '';
        });
        return { title, url, content };
    }
    catch (err) {
        console.warn('[Browser] Gagal mengakses browser:', err.message);
        return null;
    }
}
// ─── Launch Browser for Capture ─────────────────────────────────────────
export async function launchChromeForCapture() {
    try {
        const browser = await chromium.launch({
            headless: false,
            args: ['--no-first-run', '--no-default-browser-check', '--window-size=1024,768'],
        });
        _browser = browser;
        return true;
    }
    catch {
        return false;
    }
}
// ─── Close Browser ─────────────────────────────────────────────────────
export async function closeBrowser() {
    if (_browser) {
        try {
            await _browser.close();
        }
        catch { /* ignore */ }
        _browser = null;
    }
}
// ─── Capture Specific URL ──────────────────────────────────────────────────
export async function captureUrl(url) {
    let browser = null;
    try {
        // Try connecting first, else launch new
        try {
            browser = await chromium.connectOverCDP('http://localhost:9222');
        }
        catch {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox'],
            });
        }
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.title();
        const content = await page.evaluate(() => document.body?.innerText?.slice(0, 10000) || '');
        await page.close();
        await browser.close();
        return { title, url, content };
    }
    catch (err) {
        console.warn('[Browser] Gagal capture URL:', err.message);
        if (browser)
            await browser.close().catch(() => { });
        return null;
    }
}
//# sourceMappingURL=index.js.map