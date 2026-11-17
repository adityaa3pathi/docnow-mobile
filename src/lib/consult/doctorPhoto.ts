/** Checks and names a picked doctor photo before it goes to POST /doctor/me/photo. */

/** The server sniffs the real type from the file bytes and rejects anything else. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Same cap as the server; the crop and quality below keep a phone photo far under it. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export interface PickedPhoto {
  uri: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface PhotoUpload {
  uri: string;
  name: string;
  type: string;
}

/** A JPG, PNG or WebP type from the file name, since the picker does not always report one. */
export function photoTypeFromUri(uri: string): string | null {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

/** The reason this photo cannot be sent, or null when it is fine. */
export function photoProblem(photo: PickedPhoto): string | null {
  const type = photo.mimeType ?? photoTypeFromUri(photo.uri);
  if (type && !PHOTO_TYPES.includes(type as (typeof PHOTO_TYPES)[number])) return 'Choose a JPG, PNG or WebP photo.';
  if (photo.fileSize != null && photo.fileSize > MAX_PHOTO_BYTES) return 'Photos can be up to 3 MB. Please choose a smaller one.';
  return null;
}

/** The multipart part for a picked photo; JPEG is the picker's output after a crop. */
export function toPhotoUpload(photo: PickedPhoto): PhotoUpload {
  const type = photo.mimeType ?? photoTypeFromUri(photo.uri) ?? 'image/jpeg';
  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  return { uri: photo.uri, name: `photo.${ext}`, type };
}
