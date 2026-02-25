import type { HistoryEntry, Settings } from "../lib/types";

export type PlatformCapabilities = {
  hotkey: boolean;
  screenshot: boolean;
  systemOcr: boolean;
  insertText: boolean;
  floatingWindow: boolean;
  clipboardRead: boolean;
  clipboardWrite: boolean;
};

export type PlatformStorage = {
  loadSettings: () => Promise<Settings | undefined>;
  saveSettings: (settings: Settings) => Promise<void>;
  loadHistory: () => Promise<HistoryEntry[]>;
  saveHistory: (history: HistoryEntry[]) => Promise<void>;
  loadApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<void>;
};

export type Platform = {
  capabilities: PlatformCapabilities;
  storage: PlatformStorage;
  clipboard: {
    readText: () => Promise<string>;
    writeText: (text: string) => Promise<void>;
  };
  hotkey?: {
    register: (hotkey: string, onPressed: () => void | Promise<void>) => Promise<void>;
    unregisterAll: () => Promise<void>;
  };
  capture?: {
    screenshotToBase64: () => Promise<string>;
  };
  ocr?: {
    systemOcr: (imageBase64: string) => Promise<string>;
  };
  insertText?: (text: string) => Promise<void>;
  floating?: {
    openFloating: () => Promise<void>;
    closeFloating: () => Promise<void>;
    openMain: () => Promise<void>;
  };
};
