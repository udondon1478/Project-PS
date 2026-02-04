export const badFunction = <T>(data: T): T => {
  try {
    console.log(data);
    return data;
  } catch (error) {
    console.error("An error occurred while logging data:", error);
    throw error;
  }
};
