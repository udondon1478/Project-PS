export const waitJitter = async (maxMs: number = 1000): Promise<void> => {
  const ms = Math.floor(Math.random() * maxMs);
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
};
