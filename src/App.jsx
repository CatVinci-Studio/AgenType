import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { Window } from "@tauri-apps/api/window";
import { readImage, readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { openPath } from "@tauri-apps/plugin-opener";
import { Store } from "@tauri-apps/plugin-store";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import defaultPrompts from "./config/defaultPrompts.json";
import "./App.css";

const DEFAULT_SLOTS = [
  {
    id: "slot1",
    name: "正式",
    toneClass: "formal",
    language: "zh",
    length: "medium",
    greeting: true,
    closing: true,
  },
  {
    id: "slot2",
    name: "简短",
    toneClass: "concise",
    language: "zh",
    length: "short",
    greeting: false,
    closing: false,
  },
  {
    id: "slot3",
    name: "热情",
    toneClass: "warm",
    language: "zh",
    length: "medium",
    greeting: true,
    closing: true,
  },
  {
    id: "slot4",
    name: "专业",
    toneClass: "professional",
    language: "en",
    length: "medium",
    greeting: false,
    closing: true,
  },
  {
    id: "slot5",
    name: "幽默",
    toneClass: "humorous",
    language: "zh",
    length: "short",
    greeting: false,
    closing: false,
  },
];

const DEFAULT_SETTINGS = {
  candidateCount: 3,
  ocrMode: "system",
  historyEnabled: true,
  historyLimit: 50,
  modelText: "gpt-4o-mini",
  modelVision: "gpt-4o-mini",
  hotkey: "",
  modelOptions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  slots: DEFAULT_SLOTS,
};

const OCR_LABELS = {
  system: "系统 OCR",
  vision: "视觉模型",
  system_fallback_vision: "OCR 优先（失败回退）",
};

const TONE_OPTIONS = [
  { value: "formal", label: "正式" },
  { value: "concise", label: "简短" },
  { value: "warm", label: "热情" },
  { value: "professional", label: "专业" },
  { value: "humorous", label: "幽默" },
  { value: "friendly", label: "友好" },
];

const LANGUAGE_OPTIONS = [
  { value: "zh", label: "中文" },
  { value: "en", label: "英文" },
];

const LENGTH_OPTIONS = [
  { value: "short", label: "短" },
  { value: "medium", label: "中" },
  { value: "long", label: "长" },
];

const SETTINGS_STORE_PATH = "settings.json";
const STRONGHOLD_PATH_NAME = "agentype.vault";
const STRONGHOLD_CLIENT = "agentype";
const STRONGHOLD_KEY = "openai_api_key";
const STRONGHOLD_PASSWORD_KEY = "stronghold_password";

const PROMPT_FILE_NAME = "prompts.json";

const DEFAULT_HOTKEYS = {
  mac: "Ctrl+Shift+S",
  other: "Alt+Shift+S",
};

const STATUS = {
  idle: "idle",
  working: "working",
  error: "error",
  success: "success",
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getDefaultHotkey = () => {
  if (navigator.userAgent.includes("Mac")) {
    return DEFAULT_HOTKEYS.mac;
  }
  return DEFAULT_HOTKEYS.other;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const buildStyleLines = (slots) =>
  slots
    .map((slot) => {
      const greeting = slot.greeting ? "是" : "否";
      const closing = slot.closing ? "是" : "否";
      const languageLabel = slot.language === "zh" ? "中文" : "英文";
      const lengthLabel = LENGTH_OPTIONS.find((option) => option.value === slot.length)?.label ?? slot.length;
      const toneLabel = TONE_OPTIONS.find((option) => option.value === slot.toneClass)?.label ?? slot.toneClass;
      return `${slot.id}: 语气=${toneLabel}, 语言=${languageLabel}, 长度=${lengthLabel}, 称呼=${greeting}, 收尾=${closing}`;
    })
    .join("\n");

const mergeSettings = (stored) => {
  if (!stored) {
    return {
      ...DEFAULT_SETTINGS,
      hotkey: getDefaultHotkey(),
    };
  }
  const candidateCount = Math.min(
    Math.max(1, Number(stored.candidateCount || DEFAULT_SETTINGS.candidateCount)),
    DEFAULT_SLOTS.length,
  );
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    candidateCount,
    slots: stored.slots?.length ? stored.slots : DEFAULT_SETTINGS.slots,
    hotkey: stored.hotkey || getDefaultHotkey(),
  };
};

const createStrongholdPassword = () => {
  const buffer = new Uint8Array(24);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
};

async function getStrongholdStore(store) {
  let password = await store.get(STRONGHOLD_PASSWORD_KEY);
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
}

async function loadApiKey(store) {
  const { stronghold, store: secureStore } = await getStrongholdStore(store);
  const key = await secureStore.get(STRONGHOLD_KEY);
  await stronghold.save();
  await stronghold.unload();
  return key ? textDecoder.decode(key) : "";
}

async function saveApiKey(store, apiKey) {
  const { stronghold, store: secureStore } = await getStrongholdStore(store);
  if (!apiKey) {
    await secureStore.remove(STRONGHOLD_KEY);
  } else {
    await secureStore.insert(STRONGHOLD_KEY, Array.from(textEncoder.encode(apiKey)));
  }
  await stronghold.save();
  await stronghold.unload();
}

async function ensurePromptFile() {
  const dataDir = await appDataDir();
  const promptPath = await join(dataDir, PROMPT_FILE_NAME);
  const existsFile = await exists(promptPath);
  if (!existsFile) {
    await writeTextFile(promptPath, JSON.stringify(defaultPrompts, null, 2));
  }
  const content = await readTextFile(promptPath);
  const parsed = safeParseJson(content) ?? defaultPrompts;
  return { promptPath, promptConfig: parsed };
}

async function imageToBase64(image) {
  const rgba = await image.rgba();
  const { width, height } = await image.size();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法读取截图数据");
  }
  const imageData = new ImageData(new Uint8ClampedArray(rgba), width, height);
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}

async function waitForClipboardImage({ timeoutMs = 12000, intervalMs = 350 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const image = await readImage();
      if (image) {
        return image;
      }
    } catch (error) {
      // ignore while waiting
    }
    await sleep(intervalMs);
  }
  throw new Error("未检测到截图，请重试");
}

async function requestOpenAI({ apiKey, model, systemPrompt, userPrompt, imageBase64 }) {
  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: imageBase64
        ? [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ]
        : userPrompt,
    },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 请求失败: ${errorText}`);
  }
  const payload = await response.json();
  return payload.choices?.[0]?.message?.content ?? "";
}

function App() {
  const isFloating = window.location.hash.includes("floating");
  const [settings, setSettings] = useState(mergeSettings());
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState({ state: STATUS.idle, message: "" });
  const [apiKey, setApiKey] = useState("");
  const [promptConfig, setPromptConfig] = useState(defaultPrompts);
  const [promptPath, setPromptPath] = useState("");
  const [candidates, setCandidates] = useState([]);
  const storeRef = useRef(null);

  const activeSlots = useMemo(
    () => settings.slots.slice(0, settings.candidateCount),
    [settings.slots, settings.candidateCount],
  );

  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId),
    [history, selectedHistoryId],
  );

  useEffect(() => {
    const init = async () => {
      const store = await Store.load(SETTINGS_STORE_PATH, {
        defaults: { settings: DEFAULT_SETTINGS, history: [] },
      });
      storeRef.current = store;
      const storedSettings = await store.get("settings");
      setSettings(mergeSettings(storedSettings));
      const storedHistory = await store.get("history");
      setHistory(Array.isArray(storedHistory) ? storedHistory : []);

      const { promptPath, promptConfig } = await ensurePromptFile();
      setPromptConfig(promptConfig);
      setPromptPath(promptPath);

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
      await storeRef.current.set("settings", settings);
      await storeRef.current.save();
    };
    persist();
  }, [settings]);

  useEffect(() => {
    if (!storeRef.current || !settings.historyEnabled) {
      return;
    }
    const persistHistory = async () => {
      await storeRef.current.set("history", history);
      await storeRef.current.save();
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
        setStatus({ state: STATUS.error, message: "快捷键注册失败，请检查格式" });
      }
    };

    registerHotkey();
    return () => {
      unregisterAll();
    };
  }, [settings.hotkey]);

  const updateStatus = (state, message) => {
    setStatus({ state, message });
  };

  const handleApiKeySave = async () => {
    if (!storeRef.current) return;
    await saveApiKey(storeRef.current, apiKey);
    updateStatus(STATUS.success, "API Key 已保存");
  };

  const handleCapture = async () => {
    updateStatus(STATUS.working, "等待截图完成...");
    try {
      await invoke("trigger_screenshot");
      const image = await waitForClipboardImage();
      const base64 = await imageToBase64(image);
      await processInput({ imageBase64: base64, inputSource: "screenshot" });
    } catch (error) {
      updateStatus(STATUS.error, error.message || "截图失败");
    }
  };

  const handleClipboardText = async () => {
    updateStatus(STATUS.working, "读取剪贴板文本...");
    try {
      const text = await readText();
      if (!text.trim()) {
        updateStatus(STATUS.error, "剪贴板没有文本内容");
        return;
      }
      setInputText(text);
      await processInput({ inputText: text, inputSource: "clipboard" });
    } catch (error) {
      updateStatus(STATUS.error, error.message || "读取剪贴板失败");
    }
  };

  const processInput = async ({ inputText = "", imageBase64 = "", inputSource }) => {
    if (!apiKey) {
      updateStatus(STATUS.error, "请先在设置中填写 OpenAI API Key");
      return;
    }

    let finalText = inputText;
    let useVision = Boolean(imageBase64);
    if (imageBase64 && settings.ocrMode !== "vision") {
      try {
        const ocrText = await invoke("system_ocr", { image_base64: imageBase64 });
        if (ocrText?.trim()) {
          finalText = ocrText.trim();
          setInputText(finalText);
          useVision = false;
        } else if (settings.ocrMode === "system") {
          updateStatus(STATUS.working, "系统 OCR 未返回文本，使用视觉模型继续");
          useVision = true;
        }
      } catch (error) {
        if (settings.ocrMode === "system") {
          updateStatus(STATUS.working, "系统 OCR 不可用，使用视觉模型继续");
          useVision = true;
        } else {
          updateStatus(STATUS.working, "系统 OCR 失败，使用视觉模型继续");
          useVision = true;
        }
      }
    }

    if (!finalText.trim() && !useVision) {
      updateStatus(STATUS.error, "没有可处理的文本或图片");
      return;
    }

    const styles = buildStyleLines(activeSlots);
    const systemPrompt = promptConfig.system;
    const userPrompt = promptConfig.template
      .replace("{{input}}", finalText || "[图片内容]")
      .replace("{{count}}", String(activeSlots.length))
      .replace("{{styles}}", styles);

    let responseText = "";
    try {
      updateStatus(STATUS.working, "生成回复中...");
      responseText = await requestOpenAI({
        apiKey,
        model: useVision ? settings.modelVision : settings.modelText,
        systemPrompt,
        userPrompt,
        imageBase64: useVision ? imageBase64 : undefined,
      });
    } catch (error) {
      updateStatus(STATUS.error, error.message || "请求失败");
      return;
    }

    const parsed = safeParseJson(responseText);
    if (!parsed || !Array.isArray(parsed)) {
      updateStatus(STATUS.error, "返回格式解析失败，请调整 prompt 模板");
      return;
    }

    const normalized = parsed
      .map((item, index) => ({
        id: item.id || activeSlots[index]?.id || `slot${index + 1}`,
        text: String(item.text ?? "").trim(),
      }))
      .filter((item) => item.text);

    if (!normalized.length) {
      updateStatus(STATUS.error, "未生成可用回复");
      return;
    }

    setCandidates(normalized);
    updateStatus(STATUS.success, "候选回复已生成");

    if (settings.historyEnabled) {
      const historyInput = finalText || inputText;
      const entry = {
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
      updateStatus(STATUS.error, "请输入需要回复的内容");
      return;
    }
    await processInput({ inputText, inputSource: "manual" });
  };

  const handleCopy = async (text) => {
    await writeText(text);
    updateStatus(STATUS.success, "已复制到剪贴板");
  };

  const handleInsert = async (text) => {
    updateStatus(STATUS.working, "正在插入...");
    try {
      await invoke("insert_text", { text });
      updateStatus(STATUS.success, "已插入到当前输入框");
    } catch (error) {
      await writeText(text);
      updateStatus(STATUS.error, "插入失败，已复制到剪贴板");
    }
  };

  const handleOpenPromptFile = async () => {
    if (!promptPath) return;
    await openPath(promptPath);
  };

  const handleReloadPrompts = async () => {
    const { promptConfig } = await ensurePromptFile();
    setPromptConfig(promptConfig);
    updateStatus(STATUS.success, "已重新加载 prompt");
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

  const updateSlot = (slotId, patch) => {
    setSettings((prev) => ({
      ...prev,
      slots: prev.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    }));
  };

  const handleSettingsChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const statusClass = status.state === STATUS.error ? "status error" : status.state === STATUS.success ? "status success" : "status";

  if (isFloating) {
    return (
      <div className="app floating">
        <header className="floating-header">
          <div>
            <p className="eyebrow">AgenType</p>
            <h1>浮窗模式</h1>
          </div>
          <div className="floating-actions">
            <button className="ghost" onClick={handleOpenMain}>打开主界面</button>
            <button className="ghost" onClick={handleCloseFloating}>隐藏</button>
          </div>
        </header>
        <div className="status-block">
          <span className={statusClass}>{status.message || "准备就绪"}</span>
        </div>
        <div className="actions">
          <button className="primary" onClick={handleCapture}>截图并生成</button>
          <button onClick={handleClipboardText}>读取剪贴板</button>
        </div>
        <section className="panel panel-candidates">
          <div className="panel-header">
            <h2>候选回复</h2>
            <span className="chip">{candidates.length} 条</span>
          </div>
          {candidates.length === 0 ? (
            <div className="empty">等待生成回复。</div>
          ) : (
            <div className="candidate-list">
              {candidates.map((candidate) => {
                const slot = settings.slots.find((item) => item.id === candidate.id);
                return (
                  <div className="candidate-card" key={candidate.id}>
                    <div className="candidate-head">
                      <span className="tag">{slot?.name || candidate.id}</span>
                      <span className="tag subtle">{slot?.language === "en" ? "EN" : "中文"}</span>
                    </div>
                    <p>{candidate.text}</p>
                    <div className="actions">
                      <button className="primary" onClick={() => handleCopy(candidate.text)}>复制</button>
                      <button onClick={() => handleInsert(candidate.text)}>插入</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="panel panel-history">
          <div className="panel-header">
            <h2>历史记录</h2>
            <span className="chip">{history.length} 条</span>
          </div>
          {!settings.historyEnabled ? (
            <div className="empty">历史记录已关闭。</div>
          ) : history.length === 0 ? (
            <div className="empty">暂无历史记录。</div>
          ) : (
            <div className="history-list">
              {history.slice(0, 6).map((entry) => (
                <div className="history-item" key={entry.id}>
                  <div>
                    <span className="tag subtle">{new Date(entry.createdAt).toLocaleString()}</span>
                    <p>{entry.input || "(截图内容)"}</p>
                  </div>
                  <div className="history-actions">
                    {entry.candidates.slice(0, 1).map((candidate) => (
                      <button key={candidate.id} onClick={() => handleCopy(candidate.text)}>
                        复制
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">AgenType</p>
          <h1>一键截取 · 多风格回复 · 快速插入</h1>
          <p className="subhead">全局快捷键触发截图与剪贴板读取，生成多个候选回复并直接插入当前输入框。</p>
        </div>
        <div className="status-block">
          <span className={statusClass}>{status.message || "准备就绪"}</span>
          <button className="ghost" onClick={handleReloadPrompts}>
            重新加载 Prompt
          </button>
          <button className="ghost" onClick={handleOpenFloating}>
            打开浮窗
          </button>
        </div>
      </header>

      <main className="main-grid">
        <section className="panel panel-primary">
          <div className="panel-header">
            <h2>输入与触发</h2>
            <div className="chip">快捷键：{settings.hotkey}</div>
          </div>
          <div className="actions">
            <button className="primary" onClick={handleCapture}>
              截图并生成
            </button>
            <button onClick={handleClipboardText}>读取剪贴板文本</button>
          </div>
          <div className="textarea-block">
            <label htmlFor="input">需要回复的内容</label>
            <textarea
              id="input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder="粘贴或输入对方的邮件/消息内容..."
            />
          </div>
          <div className="actions">
            <button onClick={handleManualGenerate}>仅用文本生成</button>
            <button className="ghost" onClick={() => setInputText("")}>清空输入</button>
          </div>
          <div className="inline-settings">
            <div>
              <span>OCR 模式</span>
              <select
                value={settings.ocrMode}
                onChange={(event) => handleSettingsChange("ocrMode", event.target.value)}
              >
                {Object.entries(OCR_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>候选数量</span>
              <select
                value={settings.candidateCount}
                onChange={(event) => handleSettingsChange("candidateCount", Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span>历史记录</span>
              <select
                value={settings.historyEnabled ? "on" : "off"}
                onChange={(event) => handleSettingsChange("historyEnabled", event.target.value === "on")}
              >
                <option value="on">开启</option>
                <option value="off">关闭</option>
              </select>
            </div>
          </div>
        </section>

        <section className="panel panel-candidates">
          <div className="panel-header">
            <h2>候选回复</h2>
            <span className="chip">{candidates.length} 条</span>
          </div>
          {candidates.length === 0 ? (
            <div className="empty">等待生成回复。</div>
          ) : (
            <div className="candidate-list">
              {candidates.map((candidate) => {
                const slot = settings.slots.find((item) => item.id === candidate.id);
                return (
                  <div className="candidate-card" key={candidate.id}>
                    <div className="candidate-head">
                      <span className="tag">{slot?.name || candidate.id}</span>
                      <span className="tag subtle">{slot?.language === "en" ? "EN" : "中文"}</span>
                    </div>
                    <p>{candidate.text}</p>
                    <div className="actions">
                      <button className="primary" onClick={() => handleCopy(candidate.text)}>
                        复制
                      </button>
                      <button onClick={() => handleInsert(candidate.text)}>插入</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel panel-history">
          <div className="panel-header">
            <h2>历史记录</h2>
            <span className="chip">{history.length} 条</span>
          </div>
          {!settings.historyEnabled ? (
            <div className="empty">历史记录已关闭。</div>
          ) : history.length === 0 ? (
            <div className="empty">暂无历史记录。</div>
          ) : (
            <>
              <div className="history-list">
                {history.map((entry) => (
                  <div
                    className={`history-item ${entry.id === selectedHistoryId ? "active" : ""}`}
                    key={entry.id}
                  >
                    <div>
                      <span className="tag subtle">{new Date(entry.createdAt).toLocaleString()}</span>
                      <p>{entry.input || "(截图内容)"}</p>
                    </div>
                    <div className="history-actions">
                      <button onClick={() => setSelectedHistoryId(entry.id)}>查看</button>
                      {entry.candidates.slice(0, 1).map((candidate) => (
                        <button key={candidate.id} onClick={() => handleCopy(candidate.text)}>
                          复制
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {selectedHistory && (
                <div className="history-detail">
                  <div className="panel-header">
                    <h3>历史详情</h3>
                    <span className="chip">{selectedHistory.candidates.length} 条</span>
                  </div>
                  <div className="candidate-list">
                    {selectedHistory.candidates.map((candidate) => (
                      <div className="candidate-card" key={candidate.id}>
                        <div className="candidate-head">
                          <span className="tag">{candidate.id}</span>
                        </div>
                        <p>{candidate.text}</p>
                        <div className="actions">
                          <button className="primary" onClick={() => handleCopy(candidate.text)}>
                            复制
                          </button>
                          <button onClick={() => handleInsert(candidate.text)}>插入</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel panel-settings">
          <div className="panel-header">
            <h2>设置</h2>
            <span className="chip">AgenType</span>
          </div>
          <div className="settings-grid">
            <div className="setting-block">
              <label>OpenAI API Key</label>
              <div className="row">
                <input
                  type="password"
                  value={apiKey}
                  placeholder="sk-..."
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <button className="primary" onClick={handleApiKeySave}>
                  保存
                </button>
              </div>
            </div>
            <div className="setting-block">
              <label>模型选择</label>
              <div className="row">
                <input
                  value={settings.modelText}
                  onChange={(event) => handleSettingsChange("modelText", event.target.value)}
                  placeholder="文本模型"
                  list="model-options"
                />
                <input
                  value={settings.modelVision}
                  onChange={(event) => handleSettingsChange("modelVision", event.target.value)}
                  placeholder="视觉模型"
                  list="model-options"
                />
                <datalist id="model-options">
                  {settings.modelOptions.map((model) => (
                    <option value={model} key={model} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="setting-block">
              <label>快捷键</label>
              <div className="row">
                <input
                  value={settings.hotkey}
                  onChange={(event) => handleSettingsChange("hotkey", event.target.value)}
                  placeholder={getDefaultHotkey()}
                />
                <button onClick={() => handleSettingsChange("hotkey", getDefaultHotkey())}>恢复默认</button>
              </div>
            </div>
            <div className="setting-block">
              <label>Prompt 文件</label>
              <div className="row">
                <input value={promptPath} readOnly />
                <button onClick={handleOpenPromptFile}>打开</button>
              </div>
            </div>
            <div className="setting-block">
              <label>历史记录上限</label>
              <div className="row">
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={settings.historyLimit}
                  onChange={(event) => handleSettingsChange("historyLimit", Number(event.target.value))}
                />
                <span className="hint">建议 50</span>
              </div>
            </div>
          </div>

          <div className="slot-config">
            <h3>候选槽位风格</h3>
            <div className="slot-list">
              {settings.slots.map((slot) => (
                <div className="slot-card" key={slot.id}>
                  <div className="slot-title">
                    <input
                      value={slot.name}
                      onChange={(event) => updateSlot(slot.id, { name: event.target.value })}
                    />
                    <span className="tag subtle">{slot.id}</span>
                  </div>
                  <div className="slot-fields">
                    <select
                      value={slot.toneClass}
                      onChange={(event) => updateSlot(slot.id, { toneClass: event.target.value })}
                    >
                      {TONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={slot.language}
                      onChange={(event) => updateSlot(slot.id, { language: event.target.value })}
                    >
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={slot.length}
                      onChange={(event) => updateSlot(slot.id, { length: event.target.value })}
                    >
                      {LENGTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={slot.greeting}
                        onChange={(event) => updateSlot(slot.id, { greeting: event.target.checked })}
                      />
                      <span>称呼</span>
                    </label>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={slot.closing}
                        onChange={(event) => updateSlot(slot.id, { closing: event.target.checked })}
                      />
                      <span>收尾</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
