import robotsParser from 'robots-parser';

const BOOTH_ROBOTS_TXT_URL = 'https://booth.pm/robots.txt';
const USER_AGENT = 'PolySeek-Bot/0.1.0'; // Simple UA for internal project

// Singleton to cache parsed robots.txt rules
let cachedRobots: ReturnType<typeof robotsParser> | null = null;

async function getRobotsParser(): Promise<ReturnType<typeof robotsParser>> {
  if (cachedRobots) return cachedRobots;

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
      return cachedRobots;
    }

    const txt = await res.text();
    cachedRobots = robotsParser(BOOTH_ROBOTS_TXT_URL, txt);
    return cachedRobots;
  } catch (error) {
    console.warn('[BoothHttpClient] Error fetching robots.txt:', error);
    // Fallback: allow all if we can't check
    cachedRobots = robotsParser(BOOTH_ROBOTS_TXT_URL, '');
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
    // Allow user to pass their own signal, but we also want a default timeout.
    // Combining signals is complex in native fetch without extra deps, 
    // so we'll just prioritize our timeout if user doesn't pass one, 
    // or rely on the user's signal if provided (though requirements say '30s timeout setting').
    // We'll enforce the 30s timeout here.
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // Handle external abort signal if provided
    if (init?.signal) {
      init.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          'User-Agent': USER_AGENT,
        },
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const boothHttpClient = new BoothHttpClient();
