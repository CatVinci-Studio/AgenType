import type { Candidate, Slot } from "../../lib/types";
import type { Translator } from "../../lib/i18n";

type CandidatesPanelProps = {
  candidates: Candidate[];
  slots: Slot[];
  onCopy: (text: string) => void;
  onInsert?: (text: string) => void;
  title?: string;
  t: Translator;
};

const CandidatesPanel = ({ candidates, slots, onCopy, onInsert, title, t }: CandidatesPanelProps) => (
  <section className="panel panel-candidates">
    <div className="panel-header">
      <h2>{title ?? t("panel.candidates")}</h2>
      <span className="chip">{t("count.items", { count: candidates.length })}</span>
    </div>
    {candidates.length === 0 ? (
      <div className="empty">{t("empty.candidates")}</div>
    ) : (
      <div className="candidate-list">
        {candidates.map((candidate) => {
          const slot = slots.find((item) => item.id === candidate.id);
          return (
            <div className="candidate-card" key={candidate.id}>
              <div className="candidate-head">
                <span className="tag">{slot?.name || candidate.id}</span>
                <span className="tag subtle">
                  {slot?.language === "en" ? t("language.short.en") : t("language.short.zh")}
                </span>
              </div>
              {slot?.description ? <p className="slot-description">{slot.description}</p> : null}
              <p>{candidate.text}</p>
              <div className="actions">
                <button className="primary" onClick={() => onCopy(candidate.text)}>
                  {t("action.copy")}
                </button>
                {onInsert ? <button onClick={() => onInsert(candidate.text)}>{t("action.insert")}</button> : null}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);

export default CandidatesPanel;
