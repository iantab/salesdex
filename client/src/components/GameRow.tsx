import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ChartEntry, GameFlags } from "../api/types";
import "./GameRow.css";

function parseFlags(flags: string | null): GameFlags {
  if (!flags) return {};
  try {
    return JSON.parse(flags) as GameFlags;
  } catch {
    return {};
  }
}

function FlagPill({ label }: { label: string }) {
  return <span className="flag-pill">{label}</span>;
}

const FLAG_LABELS: { key: keyof GameFlags; label: string }[] = [
  { key: "no_digital", label: "No Digital" },
  { key: "no_nintendo_digital", label: "No Nintendo Digital" },
  { key: "no_nintendo_xbox_digital", label: "No N+X Digital" },
];

interface Props {
  entry: ChartEntry;
  onClick: () => void;
}

function RankBadge({ entry }: { entry: ChartEntry }) {
  if (entry.is_new_entry) {
    return <span className="rank-badge rank-badge--new">NEW</span>;
  }
  if (entry.last_month_rank == null) {
    return (
      <span className="rank-badge rank-badge--neutral">
        <Minus size={12} />
      </span>
    );
  }
  const delta = entry.last_month_rank - entry.rank;
  if (delta > 0) {
    return (
      <span className="rank-badge rank-badge--up">
        <TrendingUp size={12} />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="rank-badge rank-badge--down">
        <TrendingDown size={12} />
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="rank-badge rank-badge--neutral">
      <Minus size={12} />
    </span>
  );
}

function rankClass(rank: number) {
  if (rank === 1) return " game-row__rank--gold";
  if (rank === 2) return " game-row__rank--silver";
  if (rank === 3) return " game-row__rank--bronze";
  return "";
}

export function GameRow({ entry, onClick }: Props) {
  return (
    <div
      className="game-row"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      role="button"
      tabIndex={0}
    >
      <span className={`game-row__rank${rankClass(entry.rank)}`}>
        {entry.rank}
      </span>
      <div className="game-row__cover">
        {entry.cover_url ? (
          <img src={entry.cover_url} alt="" width={48} height={64} />
        ) : (
          <div className="game-row__cover-placeholder" />
        )}
      </div>
      <span className="game-row__title">{entry.title_en}</span>
      {(() => {
        const flags = parseFlags(entry.flags);
        const pills = FLAG_LABELS.filter(({ key }) => flags[key]);
        return pills.length > 0 ? (
          <div className="game-row__flags">
            {pills.map(({ key, label }) => (
              <FlagPill key={key} label={label} />
            ))}
          </div>
        ) : null;
      })()}
      <RankBadge entry={entry} />
    </div>
  );
}
