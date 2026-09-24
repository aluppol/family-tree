import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ClientRejection } from '../../api/errorKind';
import { preparePhoto } from './preparePhoto';

const drawImage = vi.fn();
const closeImage = vi.fn();

function stubDecodedImage(width: number, height: number): void {
  vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.resolve({ width, height, close: closeImage })));
}

function stubEncoder(sizesByQuality: Record<number, number>): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, _type, quality) => {
    callback(new Blob([new Uint8Array(sizesByQuality[Number(quality)] ?? 10)], { type: 'image/jpeg' }));
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation((_type, quality) => `data:image/jpeg;quality=${String(quality)}`);
}

beforeEach(() => {
  vi.mocked(vi.spyOn(HTMLCanvasElement.prototype, 'getContext'), { partial: true }).mockReturnValue({ fillStyle: '', fillRect: vi.fn(), drawImage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('a large photo is scaled to 800 pixels on its long side and encoded as JPEG', async () => {
  stubDecodedImage(1600, 1200);
  stubEncoder({ 0.9: 500_000 });
  const prepared = await preparePhoto(new File(['raw'], 'emma.png', { type: 'image/png' }));
  expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 800, 600);
  expect(prepared.photo.size).toBe(500_000);
  expect(prepared.previewUrl).toBe('data:image/jpeg;quality=0.9');
  expect(closeImage).toHaveBeenCalledOnce();
});

test('a small photo keeps its size', async () => {
  stubDecodedImage(300, 400);
  stubEncoder({});
  await preparePhoto(new File(['raw'], 'small.jpg', { type: 'image/jpeg' }));
  expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 300, 400);
});

test('the quality is lowered until the photo fits in 2 MB', async () => {
  stubDecodedImage(800, 800);
  stubEncoder({ 0.9: 3_000_000, 0.8: 2_500_000, 0.7: 1_900_000 });
  const prepared = await preparePhoto(new File(['raw'], 'detailed.jpg', { type: 'image/jpeg' }));
  expect(prepared.photo.size).toBe(1_900_000);
  expect(prepared.previewUrl).toBe('data:image/jpeg;quality=0.7');
});

test('a photo that never fits is rejected with an explanation', async () => {
  stubDecodedImage(800, 800);
  stubEncoder({ 0.9: 3e6, 0.8: 3e6, 0.7: 3e6, 0.6: 3e6, 0.5: 3e6, 0.4: 3e6 });
  await expect(preparePhoto(new File(['raw'], 'noise.png'))).rejects.toThrow('This photo is too large even after resizing. Choose a smaller photo.');
});

test('a file that is not an image is rejected with an explanation', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn(() => Promise.reject(new DOMException('The source image could not be decoded.'))));
  await expect(preparePhoto(new File(['text'], 'notes.txt'))).rejects.toEqual(new ClientRejection('This file is not a photo we can read. Choose a JPEG, PNG or WebP image.'));
});

test('a browser without a drawing context cannot resize', async () => {
  stubDecodedImage(800, 800);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  await expect(preparePhoto(new File(['raw'], 'emma.png'))).rejects.toThrow('Your browser cannot resize photos.');
});

test('a failed encoding is reported', async () => {
  stubDecodedImage(800, 800);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback(null);
  });
  await expect(preparePhoto(new File(['raw'], 'emma.png'))).rejects.toThrow('Your browser could not encode this photo.');
});
