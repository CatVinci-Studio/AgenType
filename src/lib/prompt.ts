import type { PromptConfig, Slot } from "./types";

const toneLabels: Record<string, string> = {
  formal: "Formal",
  concise: "Concise",
  warm: "Warm",
  professional: "Professional",
  humorous: "Humorous",
  friendly: "Friendly",
};

const lengthLabels: Record<string, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

export const buildStyleLines = (slots: Slot[]) =>
  slots
    .map((slot) => {
      const greeting = slot.greeting ? "yes" : "no";
      const closing = slot.closing ? "yes" : "no";
      const languageLabel = slot.language === "zh" ? "Chinese" : "English";
      const lengthLabel = lengthLabels[slot.length] ?? slot.length;
      const toneLabel = toneLabels[slot.toneClass] ?? slot.toneClass;
      return `${slot.id}: tone=${toneLabel}, language=${languageLabel}, length=${lengthLabel}, greeting=${greeting}, closing=${closing}`;
    })
    .join("\n");

export const renderPrompt = (config: PromptConfig, input: string, count: number, styles: string) =>
  config.template
    .replace("{{input}}", input)
    .replace("{{count}}", String(count))
    .replace("{{styles}}", styles);
