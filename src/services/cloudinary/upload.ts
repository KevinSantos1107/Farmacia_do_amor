// Cloudinary upload utility — typed, reusable
// Uses unsigned upload presets configured in the Cloudinary dashboard.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const IMAGE_PRESET = import.meta.env.VITE_CLOUDINARY_IMAGE_PRESET || 'image_uploads';
const AUDIO_PRESET = import.meta.env.VITE_CLOUDINARY_AUDIO_PRESET || 'music_uploads';

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
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Upload an image to Cloudinary.
 * Converts to JPEG base64 first to handle HEIC/iOS quirks.
 */
export async function uploadImage(
  file: File,
  folder?: string,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadResult> {
  const base64 = await fileToBase64Jpeg(file);

  const formData = new FormData();
  formData.append('file', base64);
  formData.append('upload_preset', IMAGE_PRESET);
  if (folder) formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

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
        reject(new Error(`Upload failed: ${xhr.responseText}`));
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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', AUDIO_PRESET);
  if (folder) formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

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
        reject(new Error(`Audio upload failed: ${xhr.responseText}`));
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
  const { w, h, q = 'auto', c = 'limit', f = 'auto', dpr } = opts;
  const transforms: string[] = [];
  if (w) transforms.push(`w_${w}`);
  if (h) transforms.push(`h_${h}`);
  if (dpr) transforms.push(`dpr_${dpr}`);
  transforms.push(`c_${c}`, `q_${q}`, `f_${f}`, 'fl_progressive');
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(',')}/${publicId}`;
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
