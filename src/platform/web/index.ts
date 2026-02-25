import type { HistoryEntry, Settings } from "../../lib/types";
import type { Platform } from "../types";

const storageKeys = {
  settings: "agentype.settings",
  history: "agentype.history",
  apiKey: "agentype.apiKey",
};

const safeParse = <T>(value: string | null): T | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return undefined;
  }
};

const storage = {
  loadSettings: async () => safeParse<Settings>(localStorage.getItem(storageKeys.settings)),
  saveSettings: async (settings: Settings) => {
    localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
  },
  loadHistory: async () => {
    const parsed = safeParse<HistoryEntry[]>(localStorage.getItem(storageKeys.history));
    return Array.isArray(parsed) ? parsed : [];
  },
  saveHistory: async (history: HistoryEntry[]) => {
    localStorage.setItem(storageKeys.history, JSON.stringify(history));
  },
  loadApiKey: async () => localStorage.getItem(storageKeys.apiKey) ?? "",
  saveApiKey: async (apiKey: string) => {
    if (!apiKey) {
      localStorage.removeItem(storageKeys.apiKey);
      return;
    }
    localStorage.setItem(storageKeys.apiKey, apiKey);
  },
};

const clipboard = {
  readText: async () => {
    if (!navigator.clipboard?.readText) {
      throw new Error("Clipboard read is not supported");
    }
    return navigator.clipboard.readText();
  },
  writeText: async (text: string) => {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard write is not supported");
    }
    await navigator.clipboard.writeText(text);
  },
};

export const platform: Platform = {
  capabilities: {
    hotkey: false,
    screenshot: false,
    systemOcr: false,
    insertText: false,
    floatingWindow: false,
    clipboardRead: true,
    clipboardWrite: true,
  },
  storage,
  clipboard,
};
