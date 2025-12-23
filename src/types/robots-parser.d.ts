declare module 'robots-parser' {
    interface Robot {
      isAllowed(url: string, ua?: string): boolean | undefined;
      isDisallowed(url: string, ua?: string): boolean | undefined;
      getMatchingLineNumber(url: string, ua?: string): number | undefined;
      getCrawlDelay(ua?: string): number | undefined;
      getSitemaps(): string[];
      getPreferredHost(): string | null;
    }
    
    function robotsParser(url: string, contents: string): Robot;
    export = robotsParser;
  }
