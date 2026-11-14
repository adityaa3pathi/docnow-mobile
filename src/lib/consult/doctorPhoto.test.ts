import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, photoProblem, photoTypeFromUri, toPhotoUpload } from './doctorPhoto';

describe('doctor photo', () => {
  it('reads the type from the file name when the picker reports none', () => {
    expect(photoTypeFromUri('file:///tmp/a.JPG')).toBe('image/jpeg');
    expect(photoTypeFromUri('file:///tmp/a.png')).toBe('image/png');
    expect(photoTypeFromUri('https://x.test/a.webp?v=2')).toBe('image/webp');
    expect(photoTypeFromUri('file:///tmp/a.heic')).toBeNull();
  });

  it('refuses a type the server cannot store and anything over 3 MB', () => {
    expect(photoProblem({ uri: 'file:///tmp/a.jpg', fileSize: 1000 })).toBeNull();
    expect(photoProblem({ uri: 'file:///tmp/a.heic', mimeType: 'image/heic' })).toMatch(/JPG, PNG or WebP/);
    expect(photoProblem({ uri: 'file:///tmp/a.jpg', fileSize: MAX_PHOTO_BYTES + 1 })).toMatch(/up to 3 MB/);
    expect(photoProblem({ uri: 'file:///tmp/a.jpg', fileSize: MAX_PHOTO_BYTES })).toBeNull();
  });

  it('passes an unknown type through as JPEG, which the picker writes after a crop', () => {
    expect(photoProblem({ uri: 'file:///tmp/a' })).toBeNull();
    expect(toPhotoUpload({ uri: 'file:///tmp/a' })).toEqual({ uri: 'file:///tmp/a', name: 'photo.jpg', type: 'image/jpeg' });
  });

  it('names the part from the real type', () => {
    expect(toPhotoUpload({ uri: 'file:///tmp/a.png', mimeType: 'image/png' })).toEqual({ uri: 'file:///tmp/a.png', name: 'photo.png', type: 'image/png' });
    expect(toPhotoUpload({ uri: 'file:///tmp/a.webp' }).name).toBe('photo.webp');
  });
});
