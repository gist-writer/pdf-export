import { CORS_PROXIES } from './config';

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (blob.size === 0) {
      reject(new Error('Empty blob'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result.includes(',')) {
        reject(new Error('Invalid data URL'));
        return;
      }
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function fetchImageAsBase64(url: string): Promise<string | null> {
  const attempts = [url, ...CORS_PROXIES.map((p) => p + encodeURIComponent(url))];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) continue;
      const b64 = await blobToBase64(blob);
      return `data:${blob.type};base64,${b64.split(',')[1]}`;
    } catch {
      continue;
    }
  }

  return null;
}
