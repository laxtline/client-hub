import dotenv from 'dotenv';

dotenv.config();

export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || '';
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || '';

export const imagekitEnabled = Boolean(IMAGEKIT_PRIVATE_KEY);

export async function uploadToImageKit(buffer, fileName, folder = '/clienthub/logos') {
  if (!imagekitEnabled) {
    throw new Error('ImageKit is not configured (missing IMAGEKIT_PRIVATE_KEY)');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer]), fileName);
  form.append('fileName', fileName);
  form.append('folder', folder);
  form.append('useUniqueFileName', 'true');

  const auth = Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: form, 
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ImageKit upload ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.url;
}
