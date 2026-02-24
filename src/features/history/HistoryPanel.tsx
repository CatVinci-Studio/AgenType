import type { Candidate, HistoryEntry } from "../../lib/types";
import { formatLocalTime } from "../../lib/utils";
import type { Translator } from "../../lib/i18n";

type HistoryPanelProps = {
  history: HistoryEntry[];
  historyEnabled: boolean;
  selectedHistoryId?: string;
  onSelect?: (id: string) => void;
  onCopy: (text: string) => void;
  onInsert?: (text: string) => void;
  variant?: "compact" | "full";
  t: Translator;
};

const renderActions = (candidates: Candidate[], onCopy: (text: string) => void, t: Translator) =>
  candidates.slice(0, 1).map((candidate) => (
    <button key={candidate.id} onClick={() => onCopy(candidate.text)}>
      {t("action.copy")}
    </button>
  ));

const HistoryPanel = ({
  history,
  historyEnabled,
  selectedHistoryId,
  onSelect,
  onCopy,
  onInsert,
  variant = "full",
  t,
}: HistoryPanelProps) => (
  <section className="panel panel-history">
    <div className="panel-header">
      <h2>{t("panel.history")}</h2>
      <span className="chip">{t("count.items", { count: history.length })}</span>
    </div>
    {!historyEnabled ? (
      <div className="empty">{t("empty.historyDisabled")}</div>
    ) : history.length === 0 ? (
      <div className="empty">{t("empty.history")}</div>
    ) : (
      <div className="history-list">
        {(variant === "compact" ? history.slice(0, 6) : history).map((entry) => (
          <div
            className={`history-item ${entry.id === selectedHistoryId ? "active" : ""}`}
            key={entry.id}
          >
            <div>
              <span className="tag subtle">{formatLocalTime(entry.createdAt)}</span>
              <p>{entry.input || t("label.screenshotContent")}</p>
            </div>
            <div className="history-actions">
              {variant === "full" && onSelect ? (
                <button onClick={() => onSelect(entry.id)}>{t("action.view")}</button>
              ) : null}
              {renderActions(entry.candidates, onCopy, t)}
            </div>
          </div>
        ))}
      </div>
    )}
    {variant === "full" && onInsert && selectedHistoryId ? (
      <HistoryDetail
        entry={history.find((item) => item.id === selectedHistoryId)}
        onCopy={onCopy}
        onInsert={onInsert}
        t={t}
      />
    ) : null}
  </section>
);

type HistoryDetailProps = {
  entry?: HistoryEntry;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
  t: Translator;
};

const HistoryDetail = ({ entry, onCopy, onInsert, t }: HistoryDetailProps) => {
  if (!entry) {
    return null;
  }

  return (
    <div className="history-detail">
      <div className="panel-header">
        <h3>{t("panel.historyDetail")}</h3>
        <span className="chip">{t("count.items", { count: entry.candidates.length })}</span>
      </div>
      <div className="candidate-list">
        {entry.candidates.map((candidate) => (
          <div className="candidate-card" key={candidate.id}>
            <div className="candidate-head">
              <span className="tag">{candidate.id}</span>
            </div>
            <p>{candidate.text}</p>
            <div className="actions">
              <button className="primary" onClick={() => onCopy(candidate.text)}>
                {t("action.copy")}
              </button>
              <button onClick={() => onInsert(candidate.text)}>{t("action.insert")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
