import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "./components/AppHeader";
import FloatingHeader from "./components/FloatingHeader";
import StatusBadge from "./components/StatusBadge";
import CandidatesPanel from "./features/candidates/CandidatesPanel";
import HistoryPanel from "./features/history/HistoryPanel";
import InputPanel from "./features/input/InputPanel";
import SettingsPanel from "./features/settings/SettingsPanel";
import { DEFAULT_SETTINGS } from "./lib/constants";
import { createTranslator } from "./lib/i18n";
import { requestOpenAI, requestOpenAIModels } from "./lib/openai";
import { buildStyleLines, getImageSystemPrompt, getSystemPrompt, renderPrompt } from "./lib/prompt";
import { getDefaultHotkey, mergeSettings } from "./lib/settings";
import { safeParseJson } from "./lib/utils";
import type { Candidate, HistoryEntry, Settings, Status } from "./lib/types";
import { getPlatform, type Platform, type PlatformStorage } from "./platform";
import "./App.css";

type OpenAIResult = Array<{ id?: string; text?: string }>;

function App() {
  const isFloating = window.location.hash.includes("floating");
  const [settings, setSettings] = useState<Settings>(mergeSettings());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [inputImage, setInputImage] = useState<{ base64: string; dataUrl: string } | null>(null);
  const [status, setStatus] = useState<Status>({ state: "idle", message: "" });
  const [apiKey, setApiKey] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const platformRef = useRef<Platform | null>(null);
  const storageRef = useRef<PlatformStorage | null>(null);

  const t = useMemo(() => createTranslator(settings.uiLanguage), [settings.uiLanguage]);
  const activeSlots = useMemo(() => settings.slots, [settings.slots]);

  useEffect(() => {
    const init = async () => {
      const resolvedPlatform = await getPlatform();
      platformRef.current = resolvedPlatform;
      storageRef.current = resolvedPlatform.storage;
      setPlatform(resolvedPlatform);

      const storedSettings = await resolvedPlatform.storage.loadSettings();
      const mergedSettings = mergeSettings(storedSettings);
      if (!resolvedPlatform.capabilities.systemOcr) {
        mergedSettings.ocrMode = "vision";
      }
      setSettings(mergedSettings);

      const storedHistory = await resolvedPlatform.storage.loadHistory();
      setHistory(Array.isArray(storedHistory) ? storedHistory : []);

      const apiKey = await resolvedPlatform.storage.loadApiKey();
      setApiKey(apiKey);
      if (!apiKey) {
        setSettings((prev) => ({ ...prev, modelOptions: [], model: "" }));
      } else if (mergedSettings.modelOptions.length === 0) {
        try {
          const models = await requestOpenAIModels(apiKey);
          if (models.length > 0) {
            setSettings((prev) => ({
              ...prev,
              modelOptions: models,
              model: models.includes(prev.model) ? prev.model : models[0],
            }));
          }
        } catch (error) {
          // ignore initial model load failures
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!storageRef.current) {
      return;
    }
    const persist = async () => {
      await storageRef.current?.saveSettings(settings);
    };
    persist();
  }, [settings]);

  useEffect(() => {
    if (!storageRef.current) {
      return;
    }
    const persistHistory = async () => {
      await storageRef.current?.saveHistory(history);
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
    const currentPlatform = platformRef.current;
    if (!currentPlatform?.capabilities.hotkey || !currentPlatform.hotkey || !currentPlatform.capabilities.screenshot || !currentPlatform.capture) {
      return;
    }

    const registerHotkey = async () => {
      const hotkey = settings.hotkey || getDefaultHotkey();
      try {
        await currentPlatform.hotkey?.unregisterAll();
        await currentPlatform.hotkey?.register(hotkey, async () => {
          await handleCapture();
        });
      } catch (error) {
        setStatus({ state: "error", message: t("status.hotkeyFailed") });
      }
    };

    registerHotkey();
    return () => {
      currentPlatform.hotkey?.unregisterAll();
    };
  }, [platform, settings.hotkey, t]);

  const updateStatus = (state: Status["state"], message: string) => {
    setStatus({ state, message });
  };

  const handleChangeInputMode = (mode: "text" | "image") => {
    setInputMode(mode);
    if (mode === "text") {
      setInputImage(null);
    } else {
      setInputText("");
    }
  };

  const handleApiKeySave = async () => {
    if (!storageRef.current) return;
    await storageRef.current.saveApiKey(apiKey);
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
    const currentPlatform = platformRef.current;
    if (!currentPlatform?.capture) {
      updateStatus("error", t("status.screenshotFailed"));
      return;
    }
    updateStatus("working", t("status.waitingScreenshot"));
    try {
      const base64 = await currentPlatform.capture.screenshotToBase64();
      await processInput({ imageBase64: base64, inputSource: "screenshot" });
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.screenshotFailed"));
    }
  };

  const handleClipboardFill = async () => {
    updateStatus("working", t("status.clipboardReading"));
    try {
      const text = await platformRef.current?.clipboard.readText();
      if (typeof text !== "string") {
        throw new Error(t("status.clipboardFailed"));
      }
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
      const text = await platformRef.current?.clipboard.readText();
      if (typeof text !== "string") {
        throw new Error(t("status.clipboardFailed"));
      }
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

    const finalText = inputText;
    const useVision = Boolean(imageBase64);

    if (!finalText.trim() && !useVision) {
      updateStatus("error", t("status.noContent"));
      return;
    }

    const styles = buildStyleLines(activeSlots);
    const systemPrompt = imageBase64 ? getImageSystemPrompt() : getSystemPrompt();
    const userPrompt = renderPrompt(finalText || t("label.screenshotContent"), activeSlots.length, styles);

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

    const historyInput = finalText || inputText || t("label.screenshotContent");
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

  const handleGenerate = async () => {
    if (inputMode === "image") {
      if (!inputImage?.base64) {
        updateStatus("error", t("status.noContent"));
        return;
      }
      await processInput({ imageBase64: inputImage.base64, inputSource: "image" });
      return;
    }

    if (!inputText.trim()) {
      updateStatus("error", t("status.needInput"));
      return;
    }
    await processInput({ inputText, inputSource: "manual" });
  };

  const handleCopy = async (text: string) => {
    try {
      await platformRef.current?.clipboard.writeText(text);
      updateStatus("success", t("status.copied"));
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.clipboardFailed"));
    }
  };

  const handleInsert = async (text: string) => {
    if (!platformRef.current?.capabilities.insertText || !platformRef.current.insertText) {
      await handleCopy(text);
      return;
    }
    updateStatus("working", t("status.inserting"));
    try {
      await platformRef.current.insertText(text);
      updateStatus("success", t("status.inserted"));
    } catch (error) {
      await handleCopy(text);
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
    if (!platformRef.current?.floating) {
      return;
    }
    await platformRef.current.floating.openFloating();
  };

  const handleCloseFloating = async () => {
    if (!platformRef.current?.floating) {
      return;
    }
    await platformRef.current.floating.closeFloating();
  };

  const handleOpenMain = async () => {
    if (!platformRef.current?.floating) {
      return;
    }
    await platformRef.current.floating.openMain();
  };

  const fileToBase64 = (file: File) =>
    new Promise<{ base64: string; dataUrl: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error(t("status.imageReadFailed")));
          return;
        }
        const base64 = reader.result.split(",")[1] ?? "";
        if (!base64) {
          reject(new Error(t("status.imageReadFailed")));
          return;
        }
        resolve({ base64, dataUrl: reader.result });
      };
      reader.onerror = () => reject(new Error(t("status.imageReadFailed")));
      reader.readAsDataURL(file);
    });

  const handleImageFile = async (file: File) => {
    updateStatus("working", t("status.readingImage"));
    try {
      const imageData = await fileToBase64(file);
      setInputImage(imageData);
      updateStatus("success", t("status.ready"));
    } catch (error) {
      updateStatus("error", error instanceof Error ? error.message : t("status.imageReadFailed"));
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
          {platform?.capabilities.screenshot ? (
            <button className="primary" onClick={handleCapture}>
              {t("action.capture")}
            </button>
          ) : null}
          {platform?.capabilities.clipboardRead ? (
            <button onClick={handleClipboardGenerate}>{t("action.clipboard")}</button>
          ) : null}
        </div>
        <CandidatesPanel
          candidates={candidates}
          slots={settings.slots}
          onCopy={handleCopy}
          onInsert={platform?.capabilities.insertText ? handleInsert : undefined}
          t={t}
        />
        <HistoryPanel
          history={history}
          onCopy={handleCopy}
          onClear={() => setHistory([])}
          onDelete={(id) => setHistory((prev) => prev.filter((entry) => entry.id !== id))}
          variant="compact"
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <AppHeader
        status={status}
        onOpenFloating={handleOpenFloating}
        onOpenSettings={handleOpenSettings}
        showFloating={Boolean(platform?.capabilities.floatingWindow)}
        t={t}
      />
      <main className="main-grid">
        <InputPanel
          inputText={inputText}
          inputMode={inputMode}
          hotkey={settings.hotkey}
          showHotkey={Boolean(platform?.capabilities.hotkey)}
          showCapture={Boolean(platform?.capabilities.screenshot)}
          showOcrMode={Boolean(platform?.capabilities.systemOcr)}
          showClipboard={Boolean(platform?.capabilities.clipboardRead)}
          ocrMode={settings.ocrMode}
          onChangeText={setInputText}
          onChangeMode={handleChangeInputMode}
          onCapture={handleCapture}
          onReadClipboard={handleClipboardFill}
          onImageFile={handleImageFile}
          imagePreviewUrl={inputImage?.dataUrl}
          onGenerate={handleGenerate}
          onClear={() => {
            setInputText("");
            setInputImage(null);
          }}
          onChangeOcrMode={(value) => handleSettingsChange("ocrMode", value)}
          t={t}
        />
        <CandidatesPanel
          candidates={candidates}
          slots={settings.slots}
          onCopy={handleCopy}
          onInsert={platform?.capabilities.insertText ? handleInsert : undefined}
          t={t}
        />
        <HistoryPanel
          history={history}
          selectedHistoryId={selectedHistoryId}
          onSelect={setSelectedHistoryId}
          onCopy={handleCopy}
          onInsert={platform?.capabilities.insertText ? handleInsert : undefined}
          onClear={() => {
            setHistory([]);
            setSelectedHistoryId("");
          }}
          onDelete={(id) => {
            setHistory((prev) => prev.filter((entry) => entry.id !== id));
            setSelectedHistoryId((prev) => (prev === id ? "" : prev));
          }}
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
            showHotkey={Boolean(platform?.capabilities.hotkey)}
            t={t}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
