import { appDataDir, join } from "@tauri-apps/api/path";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import type { Store as StoreType } from "@tauri-apps/plugin-store";
import {
  STRONGHOLD_CLIENT,
  STRONGHOLD_KEY,
  STRONGHOLD_PASSWORD_KEY,
  STRONGHOLD_PATH_NAME,
} from "./constants";

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
