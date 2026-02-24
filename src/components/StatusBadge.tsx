import type { Status } from "../lib/types";

type StatusBadgeProps = {
  status: Status;
  fallback: string;
};

const StatusBadge = ({ status, fallback }: StatusBadgeProps) => {
  const statusClass =
    status.state === "error" ? "status error" : status.state === "success" ? "status success" : "status";

  return <span className={statusClass}>{status.message || fallback}</span>;
};

export default StatusBadge;
