import type { FamitsuSoftwareEntry } from "../api/types";
import "./FamitsuGameRow.css";

function formatSales(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function rankClass(rank: number) {
  if (rank === 1) return " famitsu-row__rank--gold";
  if (rank === 2) return " famitsu-row__rank--silver";
  if (rank === 3) return " famitsu-row__rank--bronze";
  return "";
}

interface Props {
  entry: FamitsuSoftwareEntry;
  onClick: () => void;
}

export function FamitsuGameRow({ entry, onClick }: Props) {
  return (
    <div
      className="famitsu-row"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      role="button"
      tabIndex={0}
    >
      <span className={`famitsu-row__rank${rankClass(entry.rank)}`}>
        {entry.rank}
      </span>
      <div className="famitsu-row__cover">
        {entry.cover_url ? (
          <img src={entry.cover_url} alt="" width={48} height={64} />
        ) : (
          <div className="famitsu-row__cover-placeholder" />
        )}
      </div>
      <span className="famitsu-row__title">{entry.title_en}</span>
      {entry.is_new && <span className="famitsu-row__new-badge">NEW</span>}
      <span className="famitsu-row__platform-pill">{entry.platform}</span>
      <span className="famitsu-row__sales">
        {formatSales(entry.weekly_sales)}
      </span>
    </div>
  );
}
