import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { openPath } from "@tauri-apps/plugin-opener";
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
import { requestOpenAI } from "./lib/openai";
import { waitForClipboardImage, imageToBase64 } from "./lib/ocr";
import { buildStyleLines, renderPrompt } from "./lib/prompt";
import { getDefaultHotkey, mergeSettings } from "./lib/settings";
import { ensurePromptFile, loadApiKey, saveApiKey } from "./lib/storage";
import { safeParseJson } from "./lib/utils";
import type { Candidate, HistoryEntry, PromptConfig, Settings, Status } from "./lib/types";
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
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    system: "",
    template: "",
  });
  const [promptPath, setPromptPath] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const storeRef = useRef<Store | null>(null);

  const t = useMemo(() => createTranslator(settings.uiLanguage), [settings.uiLanguage]);
  const activeSlots = useMemo(() => settings.slots.slice(0, settings.candidateCount), [settings]);

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

      const { promptPath, promptConfig, migrated } = await ensurePromptFile();
      setPromptConfig(promptConfig);
      setPromptPath(promptPath);
      if (migrated) {
        const translator = createTranslator(mergedSettings.uiLanguage);
        setStatus({ state: "success", message: translator("status.promptMigrated") });
      }

      const apiKey = await loadApiKey(store);
      setApiKey(apiKey);
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
    if (!storeRef.current || !settings.historyEnabled) {
      return;
    }
    const persistHistory = async () => {
      await storeRef.current?.set("history", history);
      await storeRef.current?.save();
    };
    persistHistory();
  }, [history, settings.historyEnabled]);

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

  const handleClipboardText = async () => {
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
    const systemPrompt = promptConfig.system;
    const userPrompt = renderPrompt(promptConfig, finalText || "[图片内容]", activeSlots.length, styles);

    let responseText = "";
    try {
      updateStatus("working", t("status.generating"));
      responseText = await requestOpenAI({
        apiKey,
        model: useVision ? settings.modelVision : settings.modelText,
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

    if (settings.historyEnabled) {
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
    }
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

  const handleOpenPromptFile = async () => {
    if (!promptPath) return;
    await openPath(promptPath);
  };

  const handleReloadPrompts = async () => {
    const { promptConfig } = await ensurePromptFile();
    setPromptConfig(promptConfig);
    updateStatus("success", t("status.promptReloaded"));
  };

  const handleOpenFloating = async () => {
    const existing = await Window.getByLabel("floating");
    if (existing) {
      await existing.show();
      await existing.setFocus();
      return;
    }
    const floating = new Window("floating", {
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
          <button onClick={handleClipboardText}>{t("action.clipboard")}</button>
        </div>
        <CandidatesPanel candidates={candidates} slots={settings.slots} onCopy={handleCopy} onInsert={handleInsert} t={t} />
        <HistoryPanel
          history={history}
          historyEnabled={settings.historyEnabled}
          onCopy={handleCopy}
          variant="compact"
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader status={status} onReloadPrompts={handleReloadPrompts} onOpenFloating={handleOpenFloating} t={t} />
      <main className="main-grid">
        <InputPanel
          inputText={inputText}
          hotkey={settings.hotkey}
          ocrMode={settings.ocrMode}
          candidateCount={settings.candidateCount}
          historyEnabled={settings.historyEnabled}
          onChangeText={setInputText}
          onCapture={handleCapture}
          onClipboard={handleClipboardText}
          onGenerate={handleManualGenerate}
          onClear={() => setInputText("")}
          onChangeOcrMode={(value) => handleSettingsChange("ocrMode", value)}
          onChangeCandidateCount={(value) => handleSettingsChange("candidateCount", value)}
          onChangeHistoryEnabled={(value) => handleSettingsChange("historyEnabled", value)}
          t={t}
        />
        <CandidatesPanel candidates={candidates} slots={settings.slots} onCopy={handleCopy} onInsert={handleInsert} t={t} />
        <HistoryPanel
          history={history}
          historyEnabled={settings.historyEnabled}
          selectedHistoryId={selectedHistoryId}
          onSelect={setSelectedHistoryId}
          onCopy={handleCopy}
          onInsert={handleInsert}
          variant="full"
          t={t}
        />
        <SettingsPanel
          settings={settings}
          apiKey={apiKey}
          promptPath={promptPath}
          onApiKeyChange={setApiKey}
          onSaveApiKey={handleApiKeySave}
          onSettingsChange={handleSettingsChange}
          onOpenPromptFile={handleOpenPromptFile}
          onUpdateSlot={updateSlot}
          t={t}
        />
      </main>
    </div>
  );
}

export default App;
