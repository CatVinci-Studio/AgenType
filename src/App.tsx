import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { Store } from "@tauri-apps/plugin-store";
import AppHeader from "./components/AppHeader";
import FloatingHeader from "./components/FloatingHeader";
import StatusBadge from "./components/StatusBadge";
import CandidatesPanel from "./features/candidates/CandidatesPanel";
import HistoryPanel from "./features/history/HistoryPanel";
import InputPanel from "./features/input/InputPanel";
import SettingsPanel from "./features/settings/SettingsPanel";
import { DEFAULT_SETTINGS, SETTINGS_STORE_PATH } from "./lib/constants";
import { createTranslator } from "./lib/i18n";
import { requestOpenAI, requestOpenAIModels } from "./lib/openai";
import { waitForClipboardImage, imageToBase64 } from "./lib/ocr";
import { buildStyleLines, getSystemPrompt, renderPrompt } from "./lib/prompt";
import { getDefaultHotkey, mergeSettings } from "./lib/settings";
import { loadApiKey, saveApiKey } from "./lib/storage";
import { safeParseJson } from "./lib/utils";
import type { Candidate, HistoryEntry, Settings, Status } from "./lib/types";
import "./App.css";

type OpenAIResult = Array<{ id?: string; text?: string }>;

function App() {
  const isFloating = window.location.hash.includes("floating");
  const [settings, setSettings] = useState<Settings>(mergeSettings());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [status, setStatus] = useState<Status>({ state: "idle", message: "" });
  const [apiKey, setApiKey] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const storeRef = useRef<Store | null>(null);

  const t = useMemo(() => createTranslator(settings.uiLanguage), [settings.uiLanguage]);
  const activeSlots = useMemo(() => settings.slots, [settings.slots]);

  useEffect(() => {
    const init = async () => {
      const store = await Store.load(SETTINGS_STORE_PATH, {
        defaults: { settings: DEFAULT_SETTINGS, history: [] },
      });
      storeRef.current = store;
      const storedSettings = (await store.get("settings")) as Settings | undefined;
      const mergedSettings = mergeSettings(storedSettings);
      setSettings(mergedSettings);
      const storedHistory = (await store.get("history")) as HistoryEntry[] | undefined;
      setHistory(Array.isArray(storedHistory) ? storedHistory : []);

      const apiKey = await loadApiKey(store);
      setApiKey(apiKey);
      if (!apiKey) {
        setSettings((prev) => ({ ...prev, modelOptions: [], model: "" }));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!storeRef.current) {
      return;
    }
    const persist = async () => {
      await storeRef.current?.set("settings", settings);
      await storeRef.current?.save();
    };
    persist();
  }, [settings]);

  useEffect(() => {
    if (!storeRef.current) {
      return;
    }
    const persistHistory = async () => {
      await storeRef.current?.set("history", history);
      await storeRef.current?.save();
    };
    persistHistory();
  }, [history]);

  useEffect(() => {
    if (history.length > settings.historyLimit) {
      setHistory((prev) => prev.slice(0, settings.historyLimit));
    }
  }, [history.length, settings.historyLimit]);

  useEffect(() => {
    if (!selectedHistoryId && history.length > 0) {
      setSelectedHistoryId(history[0].id);
    }
  }, [history, selectedHistoryId]);

  useEffect(() => {
    const registerHotkey = async () => {
      const hotkey = settings.hotkey || getDefaultHotkey();
      try {
        await unregisterAll();
        await register(hotkey, async (event) => {
          if (event.state === "Pressed") {
            await handleCapture();
          }
        });
      } catch (error) {
        setStatus({ state: "error", message: t("status.hotkeyFailed") });
      }
    };

    registerHotkey();
    return () => {
      unregisterAll();
    };
  }, [settings.hotkey, t]);

  const updateStatus = (state: Status["state"], message: string) => {
    setStatus({ state, message });
  };

  const handleApiKeySave = async () => {
    if (!storeRef.current) return;
    await saveApiKey(storeRef.current, apiKey);
    updateStatus("success", t("status.apiKeySaved"));
    if (!apiKey) {
      setSettings((prev) => ({ ...prev, modelOptions: [], model: "" }));
      return;
    }
    try {
      const models = await requestOpenAIModels(apiKey);
      if (models.length === 0) {
        updateStatus("error", t("status.modelsFailed"));
        return;
      }
      setSettings((prev) => ({
        ...prev,
        modelOptions: models,
        model: models.includes(prev.model) ? prev.model : models[0],
      }));
      updateStatus("success", t("status.modelsUpdated"));
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.modelsFailed"));
    }
  };

  const handleCapture = async () => {
    updateStatus("working", t("status.waitingScreenshot"));
    try {
      await invoke("trigger_screenshot");
      const image = await waitForClipboardImage();
      const base64 = await imageToBase64(image);
      await processInput({ imageBase64: base64, inputSource: "screenshot" });
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.screenshotFailed"));
    }
  };

  const handleClipboardFill = async () => {
    updateStatus("working", t("status.clipboardReading"));
    try {
      const text = await readText();
      if (!text.trim()) {
        updateStatus("error", t("status.clipboardEmpty"));
        return;
      }
      setInputText(text);
      updateStatus("success", t("status.clipboardFilled"));
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.clipboardFailed"));
    }
  };

  const handleClipboardGenerate = async () => {
    updateStatus("working", t("status.clipboardReading"));
    try {
      const text = await readText();
      if (!text.trim()) {
        updateStatus("error", t("status.clipboardEmpty"));
        return;
      }
      setInputText(text);
      await processInput({ inputText: text, inputSource: "clipboard" });
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.clipboardFailed"));
    }
  };


  const processInput = async ({
    inputText = "",
    imageBase64 = "",
    inputSource,
  }: {
    inputText?: string;
    imageBase64?: string;
    inputSource: HistoryEntry["source"];
  }) => {
    if (!apiKey) {
      updateStatus("error", t("status.noApiKey"));
      return;
    }
    if (!settings.model) {
      updateStatus("error", t("status.noModel"));
      return;
    }

    let finalText = inputText;
    let useVision = Boolean(imageBase64);
    if (imageBase64 && settings.ocrMode !== "vision") {
      try {
        const ocrText = await invoke<string>("system_ocr", { image_base64: imageBase64 });
        if (ocrText?.trim()) {
          finalText = ocrText.trim();
          setInputText(finalText);
          useVision = false;
        } else if (settings.ocrMode === "system") {
          updateStatus("working", t("status.ocrEmptyFallback"));
          useVision = true;
        }
      } catch (error) {
        if (settings.ocrMode === "system") {
          updateStatus("working", t("status.ocrUnavailableFallback"));
          useVision = true;
        } else {
          updateStatus("working", t("status.ocrFailedFallback"));
          useVision = true;
        }
      }
    }

    if (!finalText.trim() && !useVision) {
      updateStatus("error", t("status.noContent"));
      return;
    }

    const styles = buildStyleLines(activeSlots);
    const systemPrompt = getSystemPrompt();
    const userPrompt = renderPrompt(finalText || "[图片内容]", activeSlots.length, styles);

    let responseText = "";
    try {
      updateStatus("working", t("status.generating"));
        responseText = await requestOpenAI({
          apiKey,
          model: settings.model,
          systemPrompt,
          userPrompt,
          imageBase64: useVision ? imageBase64 : undefined,
        });
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.requestFailed"));
      return;
    }

    const parsed = safeParseJson<OpenAIResult>(responseText);
    if (!parsed || !Array.isArray(parsed)) {
      updateStatus("error", t("status.parseFailed"));
      return;
    }

    const normalized = parsed
      .map((item, index) => ({
        id: item.id || activeSlots[index]?.id || `slot${index + 1}`,
        text: String(item.text ?? "").trim(),
      }))
      .filter((item) => item.text);

    if (!normalized.length) {
      updateStatus("error", t("status.noCandidates"));
      return;
    }

    setCandidates(normalized);
    updateStatus("success", t("status.candidatesReady"));

    const historyInput = finalText || inputText;
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      input: historyInput,
      source: inputSource,
      candidates: normalized,
      slots: activeSlots,
    };
    setHistory((prev) => [entry, ...prev].slice(0, settings.historyLimit));
  };

  const handleManualGenerate = async () => {
    if (!inputText.trim()) {
      updateStatus("error", t("status.needInput"));
      return;
    }
    await processInput({ inputText, inputSource: "manual" });
  };

  const handleCopy = async (text: string) => {
    await writeText(text);
    updateStatus("success", t("status.copied"));
  };

  const handleInsert = async (text: string) => {
    updateStatus("working", t("status.inserting"));
    try {
      await invoke("insert_text", { text });
      updateStatus("success", t("status.inserted"));
    } catch (error) {
      await writeText(text);
      updateStatus("error", t("status.insertFailedCopied"));
    }
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  const handleOpenFloating = async () => {
    const existing = await Window.getByLabel("floating");
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const floating = new WebviewWindow("floating", {
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
    floating.once("tauri://created", async () => {
      await floating.show();
      await floating.setFocus();
    });
  };

  const handleCloseFloating = async () => {
    const current = Window.getCurrent();
    await current.hide();
  };

  const handleOpenMain = async () => {
    const mainWindow = await Window.getByLabel("main");
    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
    }
  };

  const updateSlot = (slotId: string, patch: Partial<Settings["slots"][number]>) => {
    setSettings((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    }));
  };

  const handleAddSlot = () => {
    setSettings((prev) => {
      if (prev.slots.length >= 8) {
        return prev;
      }
      const existingIds = new Set(prev.slots.map((slot) => slot.id));
      let nextIndex = prev.slots.length + 1;
      while (existingIds.has(`slot${nextIndex}`)) {
        nextIndex += 1;
      }
      const base = prev.slots[prev.slots.length - 1] ?? DEFAULT_SETTINGS.slots[0];
      const newSlot = {
        ...base,
        id: `slot${nextIndex}`,
        name: `${t("label.slot")} ${nextIndex}`,
        description: "",
      };
      return { ...prev, slots: [...prev.slots, newSlot] };
    });
  };

  const handleRemoveSlot = (slotId: string) => {
    setSettings((prev) => {
      if (prev.slots.length <= 1) {
        return prev;
      }
      return { ...prev, slots: prev.slots.filter((slot) => slot.id !== slotId) };
    });
  };

  const handleSettingsChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isFloating) {
    return (
      <div className="app floating">
        <FloatingHeader onOpenMain={handleOpenMain} onClose={handleCloseFloating} t={t} />
        <div className="status-block">
          <StatusBadge status={status} fallback={t("status.ready")} />
        </div>
        <div className="actions">
          <button className="primary" onClick={handleCapture}>
            {t("action.capture")}
          </button>
          <button onClick={handleClipboardGenerate}>{t("action.clipboard")}</button>
        </div>
        <CandidatesPanel candidates={candidates} slots={settings.slots} onCopy={handleCopy} onInsert={handleInsert} t={t} />
        <HistoryPanel
          history={history}
          onCopy={handleCopy}
          variant="compact"
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader status={status} onOpenFloating={handleOpenFloating} onOpenSettings={handleOpenSettings} t={t} />
      <main className="main-grid">
        <InputPanel
          inputText={inputText}
          hotkey={settings.hotkey}
          ocrMode={settings.ocrMode}
          onChangeText={setInputText}
          onCapture={handleCapture}
          onReadClipboard={handleClipboardFill}
          onGenerate={handleManualGenerate}
          onClear={() => setInputText("")}
          onChangeOcrMode={(value) => handleSettingsChange("ocrMode", value)}
          t={t}
        />
        <CandidatesPanel candidates={candidates} slots={settings.slots} onCopy={handleCopy} onInsert={handleInsert} t={t} />
        <HistoryPanel
          history={history}
          selectedHistoryId={selectedHistoryId}
          onSelect={setSelectedHistoryId}
          onCopy={handleCopy}
          onInsert={handleInsert}
          variant="full"
          t={t}
        />
      </main>
      <div className={`settings-overlay ${settingsOpen ? "open" : ""}`} onClick={handleCloseSettings}>
        <aside className="settings-drawer" onClick={(event) => event.stopPropagation()}>
          <div className="drawer-header">
            <h2>{t("panel.settings")}</h2>
            <button className="ghost" onClick={handleCloseSettings}>
              {t("action.close")}
            </button>
          </div>
          <SettingsPanel
            settings={settings}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            onSaveApiKey={handleApiKeySave}
            onSettingsChange={handleSettingsChange}
            onUpdateSlot={updateSlot}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
            t={t}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
