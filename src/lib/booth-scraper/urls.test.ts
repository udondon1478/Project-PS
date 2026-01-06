import { describe, it, expect } from 'vitest';
import { getSearchUrl } from './urls';

describe('getSearchUrl', () => {
  it('should generate basic URL without params', () => {
    const url = getSearchUrl(1, {});
    // Should default to adult included
    expect(url).toBe('https://booth.pm/ja/items?sort=new&adult=include');
  });

  it('should handle pagination', () => {
    const url = getSearchUrl(2, {});
    expect(url).toContain('page=2');
  });

  it('should handle multiple tags passed as distinct array items', () => {
    const url = getSearchUrl(1, { tags: ['VRChat', 'Animation'] });
    // Expect tags[]=VRChat&tags[]=Animation
    expect(url).toContain('tags%5B%5D=VRChat');
    expect(url).toContain('tags%5B%5D=Animation');
  });

  it('should split space-separated tags into separate query parameters', () => {
    // This is the bug reproduction case
    const url = getSearchUrl(1, { tags: ['VRChat Animation'] });
    
    // We want this to result in two separate tags parameters
    // Currently it likely results in tags[]=VRChat%20Animation
    expect(url).toContain('tags%5B%5D=VRChat');
    expect(url).toContain('tags%5B%5D=Animation');
    expect(url).not.toContain('VRChat%20Animation');
  });

  it('should handle mixed array and space-separated tags', () => {
    const url = getSearchUrl(1, { tags: ['VRChat', '3D Model'] });
    // Assuming we want to split "3D Model" as well? 
    // If the requirement is "split space separated tags", then "3D Model" becomes "3D" and "Model".
    // If we strictly follow the user request "VRChat Animation" -> split.
    
    expect(url).toContain('tags%5B%5D=VRChat');
    expect(url).toContain('tags%5B%5D=3D');
    expect(url).toContain('tags%5B%5D=Model');
  });

  it('should include adult=include by default', () => {
    const url = getSearchUrl(1, {});
    expect(url).toContain('adult=include');
  });

  it('should allows disabling adult content', () => {
    const url = getSearchUrl(1, { adult: false });
    expect(url).not.toContain('adult=include');
  });
});
