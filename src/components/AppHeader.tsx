import StatusBadge from "./StatusBadge";
import type { Status } from "../lib/types";
import type { Translator } from "../lib/i18n";

type AppHeaderProps = {
  status: Status;
  onReloadPrompts: () => void;
  onOpenFloating: () => void;
  t: Translator;
};

const AppHeader = ({ status, onReloadPrompts, onOpenFloating, t }: AppHeaderProps) => (
  <header className="app-header">
    <div>
      <p className="eyebrow">AgenType</p>
      <h1>{t("app.title")}</h1>
      <p className="subhead">{t("app.subtitle")}</p>
    </div>
    <div className="status-block">
      <StatusBadge status={status} fallback={t("status.ready")} />
      <button className="ghost" onClick={onReloadPrompts}>
        {t("action.reloadPrompt")}
      </button>
      <button className="ghost" onClick={onOpenFloating}>
        {t("action.openFloating")}
      </button>
    </div>
  </header>
);

export default AppHeader;
