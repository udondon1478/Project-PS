export const waitJitter = async (base: number, variance: number): Promise<void> => {
  const min = Math.max(0, base - variance);
  const max = base + variance;
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  
  if (ms > 0) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
};
