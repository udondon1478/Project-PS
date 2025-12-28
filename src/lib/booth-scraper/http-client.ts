import robotsParser from 'robots-parser';

const BOOTH_ROBOTS_TXT_URL = 'https://booth.pm/robots.txt';
const USER_AGENT = 'PolySeek-Bot/0.1.0'; // Simple UA for internal project

// Cache TTL for robots.txt (1 hour in milliseconds)
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;

// Application-level response cache settings
const RESPONSE_CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL for responses
const RESPONSE_CACHE_MAX_SIZE = 100; // Max cached entries

interface CachedResponse {
  html: string;
  status: number;
  timestamp: number;
}

// Simple LRU-like cache for HTTP responses
const responseCache = new Map<string, CachedResponse>();

function isResponseCacheValid(entry: CachedResponse): boolean {
  return Date.now() - entry.timestamp < RESPONSE_CACHE_TTL_MS;
}

function pruneResponseCache(): void {
  if (responseCache.size > RESPONSE_CACHE_MAX_SIZE) {
    // Remove oldest entries (first entries in Map)
    const entriesToRemove = responseCache.size - RESPONSE_CACHE_MAX_SIZE + 10;
    const iterator = responseCache.keys();
    for (let i = 0; i < entriesToRemove; i++) {
      const key = iterator.next().value;
      if (key) responseCache.delete(key);
    }
  }
}

// Singleton to cache parsed robots.txt rules with TTL
let cachedRobots: ReturnType<typeof robotsParser> | null = null;
let cachedRobotsTimestamp: number = 0;

function isRobotsCacheValid(): boolean {
  return cachedRobots !== null && Date.now() - cachedRobotsTimestamp < ROBOTS_CACHE_TTL_MS;
}

async function getRobotsParser(): Promise<ReturnType<typeof robotsParser>> {
  if (isRobotsCacheValid()) return cachedRobots!;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const res = await fetch(BOOTH_ROBOTS_TXT_URL, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[BoothHttpClient] Failed to fetch robots.txt (status: ${res.status}). Assuming allow all.`);
      // If robots.txt doesn't exist or errors, standard behavior is to allow crawling.
      cachedRobots = robotsParser(BOOTH_ROBOTS_TXT_URL, '');
      cachedRobotsTimestamp = Date.now();
      return cachedRobots;
    }

    const txt = await res.text();
    cachedRobots = robotsParser(BOOTH_ROBOTS_TXT_URL, txt);
    cachedRobotsTimestamp = Date.now();
    return cachedRobots;
  } catch (error) {
    console.warn('[BoothHttpClient] Error fetching robots.txt:', error);
    // Fallback: allow all if we can't check
    cachedRobots = robotsParser(BOOTH_ROBOTS_TXT_URL, '');
    cachedRobotsTimestamp = Date.now();
    return cachedRobots;
  }
}

export class BoothHttpClient {
  /**
   * Fetches the URL with checks for robots.txt, 30s timeout, and custom UA.
   * Includes application-level TTL caching to avoid redundant network calls.
   * Throws Error if disallowed by robots.txt or timeout occurs.
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    // 0. Check application-level cache first (only for GET requests without body)
    const isGetRequest = !init?.method || init.method.toUpperCase() === 'GET';
    if (isGetRequest) {
      const cached = responseCache.get(url);
      if (cached && isResponseCacheValid(cached)) {
        // Return a synthetic Response from cache
        return new Response(cached.html, {
          status: cached.status,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Cache': 'HIT' }
        });
      }
    }

    // 1. Check robots.txt compliance
    const robots = await getRobotsParser();
    // robot-parser returns true/false or undefined.
    // isDisallowed(url, ua) returns true if disallowed.
    if (robots.isDisallowed(url, USER_AGENT)) {
      throw new Error(`[BoothHttpClient] Access denied by robots.txt: ${url}`);
    }

    // 2. Perform fetch with timeout and custom UA
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const signals: AbortSignal[] = [controller.signal];
    if (init?.signal) {
      signals.push(init.signal);
    }

    // Use AbortSignal.any to combine signals (Node.js 20.3.0+)
    let signal: AbortSignal;
    if ((AbortSignal as any).any) {
       signal = (AbortSignal as any).any(signals);
    } else {
       // Simple polyfill for older Node versions
       const ctrl = new AbortController();
       for (const s of signals) {
         if (s.aborted) {
           ctrl.abort(s.reason);
           break;
         }
         s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
       }
       signal = ctrl.signal;
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          'User-Agent': USER_AGENT,
          'Cookie': 'adult=t',
        },
        signal,
        // Disable Next.js fetch caching for fresh scraping results
        cache: 'no-store',
      });

      // 3. Cache successful GET responses
      if (isGetRequest && response.ok) {
        const clonedResponse = response.clone();
        clonedResponse.text().then(html => {
          responseCache.set(url, {
            html,
            status: response.status,
            timestamp: Date.now()
          });
          pruneResponseCache();
        }).catch(() => {
          // Ignore caching errors
        });
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const boothHttpClient = new BoothHttpClient();
