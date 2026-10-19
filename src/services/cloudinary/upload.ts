// Cloudinary upload utility — typed, reusable
// Uses unsigned upload presets configured in the Cloudinary dashboard.

/** Returns VITE_CLOUDINARY_CLOUD_NAME or throws a clear error if absent or empty. */
export function getCloudName(): string {
  const name =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || (import.meta.env.PROD ? 'dxxnqs4gf' : '');
  if (!name || name.trim() === '') {
    throw new Error('Cloudinary não configurado: defina VITE_CLOUDINARY_CLOUD_NAME');
  }
  return name;
}

const IMAGE_PRESET =
  import.meta.env.VITE_CLOUDINARY_IMAGE_PRESET ||
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
  'image_uploads';
const AUDIO_PRESET = import.meta.env.VITE_CLOUDINARY_AUDIO_PRESET || 'music_uploads';

function formatCloudinaryError(responseText: string, presetName: string, prefix = 'Upload failed'): Error {
  try {
    const data = JSON.parse(responseText);
    const msg = data.error?.message;
    if (msg) {
      if (
        msg.toLowerCase().includes('unsigned') ||
        msg.toLowerCase().includes('api_key') ||
        msg.toLowerCase().includes('preset')
      ) {
        return new Error(
          `Erro no Cloudinary: O preset de upload "${presetName}" precisa estar configurado como "Unsigned" no painel do Cloudinary. (${msg})`
        );
      }
      return new Error(`Erro no Cloudinary: ${msg}`);
    }
  } catch {
    // ignorar erro de parse e usar texto padrão
  }
  return new Error(`${prefix}: ${responseText}`);
}

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
}

/** Converts a File to base64 JPEG (solves iOS/Safari HEIC issues) */
async function fileToBase64Jpeg(file: File, maxWidth = 1600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / (img.width || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Upload an image to Cloudinary.
 * Converts to JPEG base64 first to handle HEIC/iOS quirks with fallback to raw file.
 */
export async function uploadImage(
  file: File,
  folder?: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadResult> {
  const cloudName = getCloudName();
  let filePayload: Blob | File | string = file;
  try {
    filePayload = await fileToBase64Jpeg(file);
  } catch (convErr) {
    console.warn('Canvas conversion failed, uploading raw file directly to Cloudinary:', convErr);
    filePayload = file;
  }

  const formData = new FormData();
  formData.append('file', filePayload);
  formData.append('upload_preset', IMAGE_PRESET);
  if (folder) formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload cancelado', 'AbortError'));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          publicId: data.public_id,
          url: data.url,
          secureUrl: data.secure_url,
          width: data.width,
          height: data.height,
          format: data.format,
          resourceType: data.resource_type,
        });
      } else {
        reject(formatCloudinaryError(xhr.responseText, IMAGE_PRESET, 'Upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

/**
 * Upload an MP3/audio file to Cloudinary.
 */
export async function uploadAudio(
  file: File,
  folder?: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadResult> {
  const cloudName = getCloudName();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', AUDIO_PRESET);
  if (folder) formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload cancelado', 'AbortError'));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          publicId: data.public_id,
          url: data.url,
          secureUrl: data.secure_url,
          format: data.format,
          resourceType: data.resource_type,
        });
      } else {
        reject(formatCloudinaryError(xhr.responseText, AUDIO_PRESET, 'Audio upload failed'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

/** Generate an optimised Cloudinary image URL */
export function cloudinaryUrl(
  publicId: string,
  opts: { w?: number; h?: number; q?: number | 'auto'; c?: string; f?: string; dpr?: number } = {}
): string {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxxnqs4gf';
  const { w, h, q = 'auto', c = 'limit', f = 'auto', dpr } = opts;
  const transforms: string[] = [];
  if (w) transforms.push(`w_${w}`);
  if (h) transforms.push(`h_${h}`);
  if (dpr) transforms.push(`dpr_${dpr}`);
  transforms.push(`c_${c}`, `q_${q}`, `f_${f}`, 'fl_progressive');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`;
}

/**
 * Generates a responsive srcset string for Cloudinary images.
 * Produces multiple widths for different viewports/device pixel ratios.
 *
 * @param publicId  - Cloudinary public ID
 * @param widths    - Array of pixel widths, e.g. [400, 800, 1200]
 * @param opts      - Base options (quality, format, crop, etc.)
 */
export function cloudinaryResponsiveSrcSet(
  publicId: string,
  widths: number[] = [400, 800, 1200],
  opts: { q?: number | 'auto'; c?: string; f?: string } = {}
): string {
  return widths
    .map((w) => `${cloudinaryUrl(publicId, { ...opts, w })} ${w}w`)
    .join(', ');
}
