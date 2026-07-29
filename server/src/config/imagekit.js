// Configures ImageKit.io, used to host uploaded client logos.
// ImageKit exposes a simple REST upload API, so we call it directly with the
// built-in fetch/FormData (Node 18+) — no extra SDK dependency required.
// Credentials come from environment variables so they are never hard-coded.
import dotenv from 'dotenv';

dotenv.config();

export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || '';
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || '';

// Enabled only when a private key is present, so the upload route can respond
// with a clear error instead of crashing when the integration isn't configured.
export const imagekitEnabled = Boolean(IMAGEKIT_PRIVATE_KEY);

/**
 * Upload an in-memory image buffer to ImageKit and return its hosted URL.
 * Uses HTTP Basic auth with the private key (username = key, empty password).
 *
 * @param {Buffer} buffer     - the image bytes (from multer's memory storage)
 * @param {string} fileName   - original file name
 * @param {string} [folder]   - destination folder in the ImageKit media library
 * @returns {Promise<string>} public URL of the uploaded file
 */
export async function uploadToImageKit(buffer, fileName, folder = '/clienthub/logos') {
  if (!imagekitEnabled) {
    throw new Error('ImageKit is not configured (missing IMAGEKIT_PRIVATE_KEY)');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer]), fileName);
  form.append('fileName', fileName);
  form.append('folder', folder);
  form.append('useUniqueFileName', 'true');

  // ImageKit uses Basic auth: base64("<privateKey>:") — note the trailing colon.
  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: form, // fetch sets the multipart boundary automatically
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ImageKit upload ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.url;
}
