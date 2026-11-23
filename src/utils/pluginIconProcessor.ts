import { MAX_PLUGIN_ICON_DATA_CHARS } from './pluginMarketplace';

const ALLOWED_ICON_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

export interface ProcessedPluginIconResult {
  ok: true;
  dataUrl: string;
  sizeBytes: number;
  dimensions: string;
}

export async function processPluginIconFile(
  file: File
): Promise<ProcessedPluginIconResult | { ok: false; error: string }> {
  const mime = (file.type || '').toLowerCase();
  const lowerName = file.name.toLowerCase();

  if (mime === 'image/svg+xml' || lowerName.endsWith('.svg')) {
    return {
      ok: false,
      error: 'SVG icons are blocked for security. Please upload a PNG, JPG, WebP, or GIF logo.',
    };
  }

  if (mime && !ALLOWED_ICON_MIME.has(mime)) {
    return {
      ok: false,
      error: 'Unsupported image format. Upload a PNG, JPG, WebP, or GIF icon.',
    };
  }

  if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
    return {
      ok: false,
      error: 'Icon file must be between 1 byte and 8 MB.',
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image file.'));
      el.src = objectUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) {
      return { ok: false, error: 'Image has invalid dimensions.' };
    }

    const sideCrop = Math.min(srcW, srcH);
    const sx = Math.floor((srcW - sideCrop) / 2);
    const sy = Math.floor((srcH - sideCrop) / 2);

    const targets = [160, 128, 96];
    const qualities = [0.88, 0.76, 0.62];

    for (const targetSize of targets) {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { ok: false, error: 'Canvas image processor is unavailable in this browser.' };
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, sx, sy, sideCrop, sideCrop, 0, 0, targetSize, targetSize);

      for (const quality of qualities) {
        const webpData = canvas.toDataURL('image/webp', quality);
        if (
          webpData.startsWith('data:image/webp;base64,') &&
          webpData.length <= MAX_PLUGIN_ICON_DATA_CHARS - 2048
        ) {
          return {
            ok: true,
            dataUrl: webpData,
            sizeBytes: webpData.length,
            dimensions: `${targetSize}×${targetSize}`,
          };
        }
      }

      const pngData = canvas.toDataURL('image/png');
      if (
        pngData.startsWith('data:image/png;base64,') &&
        pngData.length <= MAX_PLUGIN_ICON_DATA_CHARS - 2048
      ) {
        return {
          ok: true,
          dataUrl: pngData,
          sizeBytes: pngData.length,
          dimensions: `${targetSize}×${targetSize}`,
        };
      }
    }

    return {
      ok: false,
      error: 'Icon image could not be compressed under 64 KB. Please try a simpler PNG or WebP icon.',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to process plugin icon.',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
