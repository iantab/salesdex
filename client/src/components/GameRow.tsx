import type { ChartEntry } from "../api/types";
import "./GameRow.css";

interface Props {
  entry: ChartEntry;
}

function RankBadge({ entry }: { entry: ChartEntry }) {
  if (entry.is_new_entry) {
    return <span className="rank-badge rank-badge--new">NEW</span>;
  }
  if (entry.last_month_rank == null) {
    return <span className="rank-badge rank-badge--neutral">—</span>;
  }
  const delta = entry.last_month_rank - entry.rank;
  if (delta > 0) {
    return <span className="rank-badge rank-badge--up">▲{delta}</span>;
  }
  if (delta < 0) {
    return (
      <span className="rank-badge rank-badge--down">▼{Math.abs(delta)}</span>
    );
  }
  return <span className="rank-badge rank-badge--neutral">—</span>;
}

export function GameRow({ entry }: Props) {
  return (
    <div className="game-row">
      <span className="game-row__rank">{entry.rank}</span>
      <div className="game-row__cover">
        {entry.cover_url ? (
          <img src={entry.cover_url} alt="" width={48} height={64} />
        ) : (
          <div className="game-row__cover-placeholder" />
        )}
      </div>
      <span className="game-row__title">{entry.title_en}</span>
      <RankBadge entry={entry} />
    </div>
  );
}
