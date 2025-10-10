import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// JSDOMのウィンドウオブジェクトを作成
const window = new JSDOM('').window;
// DOMPurifyにウィンドウオブジェクトを渡して初期化
const purify = DOMPurify(window);

/**
 * URLのような文字列でないか、また無害な文字列であるかを判定し、無害な文字列を返す
 * @param text - 検証する文字列
 * @returns 無害化された文字列
 * @throws URLのような文字列が入力された場合、またはサニタイズ後に文字列が空になった場合
 */
export function sanitizeAndValidate(text: string): string {
  // 入力長の制限（DoS対策）
  const MAX_TAG_LENGTH = 100;
  if (text.length > MAX_TAG_LENGTH) {
    throw new Error(`Tag length must not exceed ${MAX_TAG_LENGTH} characters.`);
  }

  // URLのような文字列を拒否（より包括的なパターン）
  const urlPattern = /^([a-z][a-z0-9+.-]*:|\/\/|www\.)/i;
  if (urlPattern.test(text)) {
    throw new Error('URL-like strings are not allowed.');
  }

  // プロトコルハンドラーやdata URIなどの危険なパターンをチェック
  const dangerousPatterns = /(javascript|data|vbscript):/i;
  if (dangerousPatterns.test(text)) {
    throw new Error('Potentially dangerous content is not allowed.');
  }


  // XSS対策: HTMLタグを無害化
  const sanitizedText = purify.sanitize(text, {
    ALLOWED_TAGS: [], // すべてのHTMLタグを許可しない
    ALLOWED_ATTR: [], // すべてのHTML属性を許可しない
  });

  // サニタイズ後に文字列が空、またはスペースのみになった場合はエラー
  const trimmed = sanitizedText.trim();
  if (!trimmed) {
    throw new Error('Input is empty after sanitization.');
  }

  if (urlPattern.test(trimmed)) {
    throw new Error('URL-like strings are not allowed.');
  }
  if (dangerousPatterns.test(trimmed)) {
    throw new Error('Potentially dangerous content is not allowed.');
  }

  return trimmed;
}