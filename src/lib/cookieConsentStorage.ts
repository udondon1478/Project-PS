export const STORAGE_KEY = 'polyseek_cookie_consent';

export type ConsentStatus = 'accepted' | 'rejected' | null;

/**
 * サーバーサイドやSentryなどのContext外から同意状態を確認するためのユーティリティ
 * typeof windowチェックとtry/catchを行い、安全にlocalStorageにアクセスします。
 */
export function getStoredConsent(): ConsentStatus {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      return stored;
    }
  } catch {
    // どんな例外が発生してもnullを返す（呼び出し元へはエラーを伝播させない）
    return null;
  }
  return null;
}

/**
 * 同意状態をlocalStorageに安全に保存します。
 */
export function setStoredConsent(status: ConsentStatus): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (status === null) {
        localStorage.removeItem(STORAGE_KEY);
    } else {
        localStorage.setItem(STORAGE_KEY, status);
    }
  } catch (e) {
    console.error('Failed to save consent to localStorage:', e);
  }
}
