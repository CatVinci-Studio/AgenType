import type { Settings, Slot } from "./types";

export const DEFAULT_SLOTS: Slot[] = [
  {
    id: "slot1",
    name: "正式",
    toneClass: "formal",
    language: "zh",
    length: "medium",
    greeting: true,
    closing: true,
  },
  {
    id: "slot2",
    name: "简短",
    toneClass: "concise",
    language: "zh",
    length: "short",
    greeting: false,
    closing: false,
  },
  {
    id: "slot3",
    name: "热情",
    toneClass: "warm",
    language: "zh",
    length: "medium",
    greeting: true,
    closing: true,
  },
  {
    id: "slot4",
    name: "专业",
    toneClass: "professional",
    language: "en",
    length: "medium",
    greeting: false,
    closing: true,
  },
  {
    id: "slot5",
    name: "幽默",
    toneClass: "humorous",
    language: "zh",
    length: "short",
    greeting: false,
    closing: false,
  },
];

export const DEFAULT_SETTINGS: Settings = {
  candidateCount: 3,
  ocrMode: "system",
  historyEnabled: true,
  historyLimit: 50,
  modelText: "gpt-4o-mini",
  modelVision: "gpt-4o-mini",
  hotkey: "",
  uiLanguage: "en",
  modelOptions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
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
