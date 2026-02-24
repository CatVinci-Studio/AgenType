export type OcrMode = "system" | "vision" | "system_fallback_vision";

export type UiLanguage = "en" | "zh";

export type Slot = {
  id: string;
  name: string;
  description: string;
  toneClass: string;
  language: "zh" | "en";
  length: "short" | "medium" | "long";
  emailFormat: boolean;
};

export type Settings = {
  ocrMode: OcrMode;
  historyLimit: number;
  model: string;
  modelOptions: string[];
  hotkey: string;
  uiLanguage: UiLanguage;
  slots: Slot[];
};

export type Candidate = {
  id: string;
  text: string;
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  input: string;
  source: "screenshot" | "clipboard" | "manual";
  candidates: Candidate[];
  slots: Slot[];
};

export type PromptConfig = {
  system: string;
  template: string;
};

export type StatusState = "idle" | "working" | "error" | "success";

export type Status = {
  state: StatusState;
  message: string;
};
