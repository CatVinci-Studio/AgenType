import StatusBadge from "./StatusBadge";
import type { Status } from "../lib/types";
import type { Translator } from "../lib/i18n";

type AppHeaderProps = {
  status: Status;
  onOpenFloating: () => void;
  onOpenSettings: () => void;
  t: Translator;
};

const AppHeader = ({ status, onOpenFloating, onOpenSettings, t }: AppHeaderProps) => (
  <header className="app-header">
    <div>
      <p className="eyebrow">AgenType</p>
      <h1>{t("app.title")}</h1>
      <p className="subhead">{t("app.subtitle")}</p>
    </div>
    <div className="status-block">
      <StatusBadge status={status} fallback={t("status.ready")} />
      <button className="ghost" onClick={onOpenFloating}>
        {t("action.openFloating")}
      </button>
      <button className="ghost" onClick={onOpenSettings}>
        {t("action.settings")}
      </button>
    </div>
  </header>
);

export default AppHeader;
