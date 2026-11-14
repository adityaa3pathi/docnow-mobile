// The only place that touches expo-web-browser, so tested files stay free of native modules.
import * as WebBrowser from 'expo-web-browser';

/**
 * Opens a signed, short-lived DocNow link in the in-app browser. Reports and invoices are streamed
 * by our server, so no storage URL ever reaches the phone.
 */
export async function openSignedDocument(url: string): Promise<void> {
    await WebBrowser.openBrowserAsync(url, { showTitle: true, enableBarCollapsing: true });
}
