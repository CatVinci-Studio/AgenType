import type { Translator } from "../lib/i18n";

type FloatingHeaderProps = {
  onOpenMain: () => void;
  onClose: () => void;
  t: Translator;
};

const FloatingHeader = ({ onOpenMain, onClose, t }: FloatingHeaderProps) => (
  <header className="floating-header">
    <div>
      <p className="eyebrow">AgenType</p>
      <h1>{t("panel.floating")}</h1>
    </div>
    <div className="floating-actions">
      <button className="ghost" onClick={onOpenMain}>
        {t("action.openMain")}
      </button>
      <button className="ghost" onClick={onClose}>
        {t("action.hide")}
      </button>
    </div>
  </header>
);

export default FloatingHeader;
