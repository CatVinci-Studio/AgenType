import type { Settings, Slot } from "./types";

export const DEFAULT_SLOTS: Slot[] = [
  {
    id: "slot1",
    name: "正式",
    description: "",
    toneClass: "formal",
    language: "zh",
    length: "medium",
    emailFormat: true,
  },
  {
    id: "slot2",
    name: "简短",
    description: "",
    toneClass: "concise",
    language: "zh",
    length: "short",
    emailFormat: false,
  },
  {
    id: "slot3",
    name: "热情",
    description: "",
    toneClass: "warm",
    language: "zh",
    length: "medium",
    emailFormat: true,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  ocrMode: "system",
  historyLimit: 50,
  model: "",
  hotkey: "",
  uiLanguage: "en",
  modelOptions: [],
  slots: DEFAULT_SLOTS,
};

export const OCR_OPTIONS = ["system", "vision", "system_fallback_vision"] as const;
export const TONE_OPTIONS = ["formal", "concise", "warm", "professional", "humorous", "friendly"] as const;
export const LANGUAGE_OPTIONS = ["zh", "en"] as const;
export const LENGTH_OPTIONS = ["short", "medium", "long"] as const;

export const SETTINGS_STORE_PATH = "settings.json";
export const STRONGHOLD_PATH_NAME = "agentype.vault";
export const STRONGHOLD_CLIENT = "agentype";
export const STRONGHOLD_KEY = "openai_api_key";
export const STRONGHOLD_PASSWORD_KEY = "stronghold_password";
export const PROMPT_FILE_NAME = "prompts.json";
export const DEFAULT_HOTKEYS = {
  mac: "Ctrl+Shift+S",
  other: "Alt+Shift+S",
};
