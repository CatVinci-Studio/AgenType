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
  modelOptions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  slots: DEFAULT_SLOTS,
};

export const OCR_LABELS: Record<string, string> = {
  system: "系统 OCR",
  vision: "视觉模型",
  system_fallback_vision: "OCR 优先（失败回退）",
};

export const TONE_OPTIONS = [
  { value: "formal", label: "正式" },
  { value: "concise", label: "简短" },
  { value: "warm", label: "热情" },
  { value: "professional", label: "专业" },
  { value: "humorous", label: "幽默" },
  { value: "friendly", label: "友好" },
];

export const LANGUAGE_OPTIONS = [
  { value: "zh", label: "中文" },
  { value: "en", label: "英文" },
];

export const LENGTH_OPTIONS = [
  { value: "short", label: "短" },
  { value: "medium", label: "中" },
  { value: "long", label: "长" },
];

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
