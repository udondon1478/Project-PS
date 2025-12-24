import robotsParser from 'robots-parser';

const BOOTH_ROBOTS_TXT_URL = 'https://booth.pm/robots.txt';
const USER_AGENT = 'PolySeek-Bot/0.1.0'; // Simple UA for internal project

// Cache TTL for robots.txt (1 hour in milliseconds)
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;

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
      signal: controller.signal
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
   * Throws Error if disallowed by robots.txt or timeout occurs.
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
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

    // Use AbortSignal.any to combine signals (Node.js 20+)
    // Using cast to avoid potential TypeScript lib issues if restricted
    const signal = (AbortSignal as any).any(signals);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          'User-Agent': USER_AGENT,
        },
        signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const boothHttpClient = new BoothHttpClient();
