import { ClientRejection } from '../../api/errorKind';

export interface PreparedPhoto {
  photo: Blob;
  previewUrl: string;
}

interface PixelSize {
  width: number;
  height: number;
}

interface EncodedJpeg {
  blob: Blob;
  quality: number;
}

const LONGEST_EDGE_IN_PIXELS = 800;
const MAXIMUM_PHOTO_BYTES = 2 * 1024 * 1024;
const JPEG_QUALITIES = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const JPEG_BACKGROUND = 'white';

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const image = await decodeImage(file);
  const canvas = drawScaled(image, fitWithin({ width: image.width, height: image.height }, LONGEST_EDGE_IN_PIXELS));
  image.close();
  const encoded = await encodeWithinLimit(canvas);
  return { photo: encoded.blob, previewUrl: canvas.toDataURL('image/jpeg', encoded.quality) };
}

function fitWithin(size: PixelSize, longestEdge: number): PixelSize {
  const scale = Math.min(1, longestEdge / Math.max(size.width, size.height));
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

async function encodeWithinLimit(canvas: HTMLCanvasElement): Promise<EncodedJpeg> {
  for (const quality of JPEG_QUALITIES) {
    const blob = await encodeJpeg(canvas, quality);
    if (blob.size <= MAXIMUM_PHOTO_BYTES) {
      return { blob, quality };
    }
  }
  throw new ClientRejection('This photo is too large even after resizing. Choose a smaller photo.');
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new ClientRejection('This file is not a photo we can read. Choose a JPEG, PNG or WebP image.');
  }
}

function drawScaled(image: ImageBitmap, size: PixelSize): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new ClientRejection('Your browser cannot resize photos.');
  }
  context.fillStyle = JPEG_BACKGROUND;
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (encoded) => {
        if (encoded === null) {
          reject(new ClientRejection('Your browser could not encode this photo.'));
        } else {
          resolve(encoded);
        }
      },
      'image/jpeg',
      quality,
    );
  });
}
