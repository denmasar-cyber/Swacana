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
export interface BrowserPage {
    title: string;
    url: string;
    content: string;
}
export interface BrowserInfo {
    available: boolean;
    version?: string;
    path?: string;
}
export declare function checkChrome(): Promise<BrowserInfo>;
export declare function getActiveTabContent(): Promise<BrowserPage | null>;
export declare function launchChromeForCapture(): Promise<boolean>;
export declare function closeBrowser(): Promise<void>;
export declare function captureUrl(url: string): Promise<BrowserPage | null>;
//# sourceMappingURL=index.d.ts.map