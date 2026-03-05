import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const OLD_ICON_BASE = 'PolySeek_10_export_icon';
const NEW_ICON_FILENAME = 'PolySeek_icon.svg';

const EXCLUDED_DIRS = new Set([
  'node_modules', '.next', '.takt', 'dist', '.git',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** Source files that should reference the new icon filename after rename */
const FILES_WITH_ICON_REFERENCE = [
  'src/app/layout.tsx',
  'src/components/Header.tsx',
  'src/components/HeaderNavigationSkeleton.tsx',
  'src/components/TagDescriptionHistory.tsx',
  'src/components/TagDetailModal.tsx',
  'src/app/products/[productId]/ProductDetailClient.tsx',
  'remotion/src/feature-pv/scenes/SceneCTA/index.tsx',
  'remotion/src/scenes/Scene5CTA/index.tsx',
];

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Icon rename: PolySeek_10_export_icon.svg → PolySeek_icon.svg', () => {
  describe('SVG file existence', () => {
    it('should have new icon file at public/images/', () => {
      // Given: the expected new icon path
      const filePath = path.join(PROJECT_ROOT, 'public/images', NEW_ICON_FILENAME);

      // When & Then: the file should exist
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should have new icon file at remotion/public/images/', () => {
      // Given: the expected new icon path in remotion
      const filePath = path.join(PROJECT_ROOT, 'remotion/public/images', NEW_ICON_FILENAME);

      // When & Then: the file should exist
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should not have old icon file at public/images/', () => {
      // Given: the old icon path
      const oldPath = path.join(PROJECT_ROOT, 'public/images', `${OLD_ICON_BASE}.svg`);

      // When & Then: the old file should not exist
      expect(fs.existsSync(oldPath)).toBe(false);
    });

    it('should not have old icon file at remotion/public/images/', () => {
      // Given: the old icon path in remotion
      const oldPath = path.join(PROJECT_ROOT, 'remotion/public/images', `${OLD_ICON_BASE}.svg`);

      // When & Then: the old file should not exist
      expect(fs.existsSync(oldPath)).toBe(false);
    });
  });

  describe('No old filename references in source code', () => {
    it('should not reference old filename in any source file under src/', () => {
      // Given: all source files in src/
      const sourceFiles = collectSourceFiles(path.join(PROJECT_ROOT, 'src'));

      // When: checking each file for the old icon base name
      const filesWithOldRef = sourceFiles.filter(file =>
        fs.readFileSync(file, 'utf-8').includes(OLD_ICON_BASE)
      );

      // Then: no files should contain the old reference
      expect(filesWithOldRef).toEqual([]);
    });

    it('should not reference old filename in any source file under remotion/src/', () => {
      // Given: all source files in remotion/src/
      const sourceFiles = collectSourceFiles(path.join(PROJECT_ROOT, 'remotion/src'));

      // When: checking each file for the old icon base name
      const filesWithOldRef = sourceFiles.filter(file =>
        fs.readFileSync(file, 'utf-8').includes(OLD_ICON_BASE)
      );

      // Then: no files should contain the old reference
      expect(filesWithOldRef).toEqual([]);
    });
  });

  describe('New filename references in expected files', () => {
    it.each(FILES_WITH_ICON_REFERENCE)(
      'should reference new filename in %s',
      (relativePath: string) => {
        // Given: a file that should contain the new icon filename
        const filePath = path.join(PROJECT_ROOT, relativePath);

        // When: reading the file content
        const content = fs.readFileSync(filePath, 'utf-8');

        // Then: it should contain the new filename
        expect(content).toContain(NEW_ICON_FILENAME);
      }
    );
  });
});
