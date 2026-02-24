export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return null;
  }
};

export const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const formatLocalTime = (value: string) => new Date(value).toLocaleString();
