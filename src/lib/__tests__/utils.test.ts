import { describe, it, expect } from 'vitest';
import { normalizeQueryParam } from '../utils';

describe('normalizeQueryParam', () => {
  it('returns undefined for null or undefined input', () => {
    expect(normalizeQueryParam(null)).toBeUndefined();
    expect(normalizeQueryParam(undefined)).toBeUndefined();
    expect(normalizeQueryParam('')).toBeUndefined();
  });

  it('handles single string input', () => {
    expect(normalizeQueryParam('foo')).toEqual(['foo']);
  });

  it('handles comma-separated string input', () => {
    expect(normalizeQueryParam('foo,bar')).toEqual(['foo', 'bar']);
    expect(normalizeQueryParam('foo, bar, baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('handles array input', () => {
    expect(normalizeQueryParam(['foo', 'bar'])).toEqual(['foo', 'bar']);
  });

  it('handles array with comma-separated elements', () => {
    expect(normalizeQueryParam(['foo,bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
    expect(normalizeQueryParam(['a,b', 'c,d'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('trims whitespace and filters empty strings', () => {
    expect(normalizeQueryParam(' foo ,  , bar ')).toEqual(['foo', 'bar']);
    expect(normalizeQueryParam([' foo ', ' ', 'bar'])).toEqual(['foo', 'bar']);
  });

  it('removes duplicates', () => {
    expect(normalizeQueryParam('foo,bar,foo')).toEqual(['foo', 'bar']);
    expect(normalizeQueryParam(['foo', 'bar', 'foo'])).toEqual(['foo', 'bar']);
  });
});
