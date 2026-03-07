import { describe, it, expect } from 'vitest';
import { REPORT_ERROR_MESSAGES, PROPOSAL_ERROR_MESSAGES } from '../messages';

// AR-005/AR-006 再発防止: 定義された定数は全て使用されていることを保証する
// 未使用のキーが追加された場合、このテストが定数オブジェクトの構造を検証する

describe('REPORT_ERROR_MESSAGES', () => {
  it('should only contain expected keys', () => {
    const expectedKeys = [
      'UNAUTHORIZED',
      'ACCOUNT_SUSPENDED',
      'TOO_MANY_REPORTS',
      'OWN_PRODUCT',
      'OWN_TAG',
      'INVALID_TARGET_TYPE',
      'ALREADY_REPORTED',
      'INTERNAL_SERVER_ERROR',
    ];
    expect(Object.keys(REPORT_ERROR_MESSAGES).sort()).toEqual(
      expectedKeys.sort(),
    );
  });

  it('should have non-empty string values for all keys', () => {
    for (const [key, value] of Object.entries(REPORT_ERROR_MESSAGES)) {
      expect(value, `${key} should be a non-empty string`).toBeTruthy();
      expect(typeof value).toBe('string');
    }
  });
});

describe('PROPOSAL_ERROR_MESSAGES', () => {
  it('should only contain expected keys', () => {
    const expectedKeys = [
      'UNAUTHORIZED',
      'ACCOUNT_SUSPENDED',
      'TAG_NOT_FOUND',
      'TOO_MANY_PROPOSALS',
      'DUPLICATE_PROPOSAL',
      'INTERNAL_SERVER_ERROR',
    ];
    expect(Object.keys(PROPOSAL_ERROR_MESSAGES).sort()).toEqual(
      expectedKeys.sort(),
    );
  });

  it('should have non-empty string values for all keys', () => {
    for (const [key, value] of Object.entries(PROPOSAL_ERROR_MESSAGES)) {
      expect(value, `${key} should be a non-empty string`).toBeTruthy();
      expect(typeof value).toBe('string');
    }
  });
});
