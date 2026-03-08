import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OG_IMAGE_PATH } from '../og-image-path';

const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');
const OG_IMAGE_FILE = resolve(PROJECT_ROOT, `public${OG_IMAGE_PATH}`);

// PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('OGP image asset', () => {
  it('exists at the path referenced by layout.tsx openGraph config', () => {
    expect(existsSync(OG_IMAGE_FILE)).toBe(true);
  });

  it('is a valid PNG file', () => {
    const fileBuffer = readFileSync(OG_IMAGE_FILE);
    const header = fileBuffer.subarray(0, 8);

    expect(Buffer.compare(header, PNG_MAGIC_BYTES)).toBe(0);
  });

  it('has the expected width of 1200px', () => {
    const fileBuffer = readFileSync(OG_IMAGE_FILE);
    // PNG IHDR chunk: width is stored as a 4-byte big-endian integer at offset 16
    const width = fileBuffer.readUInt32BE(16);

    expect(width).toBe(1200);
  });

  it('has a file size no larger than 5MB', () => {
    const fileBuffer = readFileSync(OG_IMAGE_FILE);
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    expect(fileBuffer.length).toBeLessThanOrEqual(MAX_SIZE);
  });
});
