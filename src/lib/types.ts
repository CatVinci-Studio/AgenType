export type OcrMode = "system" | "vision" | "system_fallback_vision";

export type UiLanguage = "en" | "zh";

export type Slot = {
  id: string;
  name: string;
  toneClass: string;
  language: "zh" | "en";
  length: "short" | "medium" | "long";
  greeting: boolean;
  closing: boolean;
};

export type Settings = {
  candidateCount: number;
  ocrMode: OcrMode;
  historyEnabled: boolean;
  historyLimit: number;
  modelText: string;
  modelVision: string;
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
