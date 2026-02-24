import { appDataDir, join } from "@tauri-apps/api/path";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import type { Store as StoreType } from "@tauri-apps/plugin-store";
import defaultPrompts from "../config/defaultPrompts.json";
import {
  PROMPT_FILE_NAME,
  STRONGHOLD_CLIENT,
  STRONGHOLD_KEY,
  STRONGHOLD_PASSWORD_KEY,
  STRONGHOLD_PATH_NAME,
} from "./constants";
import { safeParseJson } from "./utils";
import type { PromptConfig } from "./types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const createStrongholdPassword = () => {
  const buffer = new Uint8Array(24);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
};

const getStrongholdStore = async (store: StoreType) => {
  let password = (await store.get(STRONGHOLD_PASSWORD_KEY)) as string | undefined;
  if (!password) {
    password = createStrongholdPassword();
    await store.set(STRONGHOLD_PASSWORD_KEY, password);
    await store.save();
  }

  const dataDir = await appDataDir();
  const strongholdPath = await join(dataDir, STRONGHOLD_PATH_NAME);
  const stronghold = await Stronghold.load(strongholdPath, password);
  let client;
  try {
    client = await stronghold.loadClient(STRONGHOLD_CLIENT);
  } catch (error) {
    client = await stronghold.createClient(STRONGHOLD_CLIENT);
  }
  return { stronghold, store: client.getStore() };
};

export const loadApiKey = async (store: StoreType) => {
  const { stronghold, store: secureStore } = await getStrongholdStore(store);
  const key = await secureStore.get(STRONGHOLD_KEY);
  await stronghold.save();
  await stronghold.unload();
  return key ? textDecoder.decode(key) : "";
};

export const saveApiKey = async (store: StoreType, apiKey: string) => {
  const { stronghold, store: secureStore } = await getStrongholdStore(store);
  if (!apiKey) {
    await secureStore.remove(STRONGHOLD_KEY);
  } else {
    await secureStore.insert(STRONGHOLD_KEY, Array.from(textEncoder.encode(apiKey)));
  }
  await stronghold.save();
  await stronghold.unload();
};

export const ensurePromptFile = async () => {
  const dataDir = await appDataDir();
  const promptPath = await join(dataDir, PROMPT_FILE_NAME);
  const defaultContent = JSON.stringify(defaultPrompts, null, 2);
  const existsFile = await exists(promptPath);
  let currentContent = "";
  if (existsFile) {
    currentContent = await readTextFile(promptPath);
  }

  const normalized = currentContent.trim();
  const shouldWrite = !existsFile || normalized !== defaultContent;
  if (shouldWrite) {
    await writeTextFile(promptPath, defaultContent);
  }

  const parsed = safeParseJson<PromptConfig>(defaultContent) ?? defaultPrompts;
  return { promptPath, promptConfig: parsed, migrated: existsFile && normalized !== defaultContent };
};
