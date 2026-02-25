import type { Slot } from "./types";

const SYSTEM_PROMPT =
  "You are a professional assistant that drafts concise and appropriate replies. Output only a JSON array and nothing else.";
const IMAGE_SYSTEM_PROMPT =
  "You are a professional assistant that drafts concise and appropriate replies. Output only a JSON array and nothing else. Reply to the message contained in the image.";
const TEMPLATE_PROMPT =
  "Original content:\n{{input}}\n\nGenerate {{count}} reply candidates. Each candidate must strictly follow its style configuration:\n{{styles}}\n\nOutput format must be a JSON array, each item contains id and text:\n[{\"id\":\"slot1\",\"text\":\"...\"}]";

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
      const emailFormat = slot.emailFormat ? "yes" : "no";
      const languageLabel = slot.language === "zh" ? "Chinese" : "English";
      const lengthLabel = lengthLabels[slot.length] ?? slot.length;
      const toneLabel = toneLabels[slot.toneClass] ?? slot.toneClass;
      const description = slot.description?.trim();
      const descriptionPart = description ? `, description=${description}` : "";
      return `${slot.id}: tone=${toneLabel}, language=${languageLabel}, length=${lengthLabel}, emailFormat=${emailFormat}${descriptionPart}`;
    })
    .join("\n");

export const getSystemPrompt = () => SYSTEM_PROMPT;

export const getImageSystemPrompt = () => IMAGE_SYSTEM_PROMPT;

export const renderPrompt = (input: string, count: number, styles: string) =>
  TEMPLATE_PROMPT.replace("{{input}}", input).replace("{{count}}", String(count)).replace("{{styles}}", styles);
