import { appDataDir, join } from "@tauri-apps/api/path";
import { Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Store } from "@tauri-apps/plugin-store";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import type { HistoryEntry, Settings } from "../../lib/types";
import { DEFAULT_SETTINGS, SETTINGS_STORE_PATH, STRONGHOLD_CLIENT, STRONGHOLD_KEY, STRONGHOLD_PASSWORD_KEY, STRONGHOLD_PATH_NAME } from "../../lib/constants";
import type { Platform } from "../types";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const createStrongholdPassword = () => {
  const buffer = new Uint8Array(24);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
};

let storePromise: Promise<Store> | null = null;

const loadStore = async () => {
  if (!storePromise) {
    storePromise = Store.load(SETTINGS_STORE_PATH, {
      defaults: { settings: DEFAULT_SETTINGS, history: [] },
    });
  }
  return storePromise;
};

const getStrongholdStore = async () => {
  const store = await loadStore();
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

const storage = {
  loadSettings: async () => {
    const store = await loadStore();
    return (await store.get("settings")) as Settings | undefined;
  },
  saveSettings: async (settings: Settings) => {
    const store = await loadStore();
    await store.set("settings", settings);
    await store.save();
  },
  loadHistory: async () => {
    const store = await loadStore();
    const storedHistory = (await store.get("history")) as HistoryEntry[] | undefined;
    return Array.isArray(storedHistory) ? storedHistory : [];
  },
  saveHistory: async (history: HistoryEntry[]) => {
    const store = await loadStore();
    await store.set("history", history);
    await store.save();
  },
  loadApiKey: async () => {
    const { stronghold, store } = await getStrongholdStore();
    const key = await store.get(STRONGHOLD_KEY);
    await stronghold.save();
    await stronghold.unload();
    return key ? textDecoder.decode(key) : "";
  },
  saveApiKey: async (apiKey: string) => {
    const { stronghold, store } = await getStrongholdStore();
    if (!apiKey) {
      await store.remove(STRONGHOLD_KEY);
    } else {
      await store.insert(STRONGHOLD_KEY, Array.from(textEncoder.encode(apiKey)));
    }
    await stronghold.save();
    await stronghold.unload();
  },
};


const clipboard = {
  readText: async () => readText(),
  writeText: async (text: string) => writeText(text),
};

const floating = {
  openFloating: async () => {
    const existing = await Window.getByLabel("floating");
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const floatingWindow = new WebviewWindow("floating", {
      url: "/#/floating",
      title: "AgenType",
      width: 420,
      height: 620,
      resizable: false,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      transparent: false,
    });
    floatingWindow.once("tauri://created", async () => {
      await floatingWindow.show();
      await floatingWindow.setFocus();
    });
  },
  closeFloating: async () => {
    const current = Window.getCurrent();
    await current.hide();
  },
  openMain: async () => {
    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
    }
  },
};

export const platform: Platform = {
  capabilities: {
    hotkey: false,
    screenshot: false,
    systemOcr: false,
    insertText: false,
    floatingWindow: true,
    clipboardRead: true,
    clipboardWrite: true,
  },
  storage,
  clipboard,
  floating,
};
