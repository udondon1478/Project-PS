import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
