import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');
const OG_IMAGE_PATH = resolve(PROJECT_ROOT, 'public/images/PolySeek_icon_and_typo_1200.png');

// PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('OGP image asset', () => {
  it('exists at the path referenced by layout.tsx openGraph config', () => {
    expect(existsSync(OG_IMAGE_PATH)).toBe(true);
  });

  it('is a valid PNG file', () => {
    const fileBuffer = readFileSync(OG_IMAGE_PATH);
    const header = fileBuffer.subarray(0, 8);

    expect(Buffer.compare(header, PNG_MAGIC_BYTES)).toBe(0);
  });

  it('has a file size suitable for OGP (between 10KB and 5MB)', () => {
    const fileBuffer = readFileSync(OG_IMAGE_PATH);
    const sizeInBytes = fileBuffer.length;
    const MIN_SIZE = 10 * 1024; // 10KB
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    expect(sizeInBytes).toBeGreaterThanOrEqual(MIN_SIZE);
    expect(sizeInBytes).toBeLessThanOrEqual(MAX_SIZE);
  });
});
