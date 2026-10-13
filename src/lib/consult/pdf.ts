// The only place that touches expo-file-system and expo-sharing, so tested files stay free of native code.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Saves PDF bytes to the app cache, then opens the phone's share sheet so the user can open or save it. */
export async function sharePdf(data: ArrayBuffer, fileName: string) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(new Uint8Array(data));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Your prescription' });
}
