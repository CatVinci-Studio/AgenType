import type { Status } from "../lib/types";

type StatusBadgeProps = {
  status: Status;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusClass =
    status.state === "error" ? "status error" : status.state === "success" ? "status success" : "status";

  return <span className={statusClass}>{status.message || "准备就绪"}</span>;
};

export default StatusBadge;
