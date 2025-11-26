/**
 * Encodes a query string component for use in URLs.
 * This is a wrapper around encodeURIComponent to improve readability.
 * 
 * @param query The query string to encode
 * @returns The encoded query string
 */
export const encodeQuery = (query: string): string => encodeURIComponent(query);
