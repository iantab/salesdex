import { useQuery } from "@tanstack/react-query";
import { fetchGame } from "../api/games";
import { fetchTrends } from "../api/circana";
import { fetchFamitsuTrends } from "../api/famitsu";
import { buildCircanaChartData, buildFamitsuChartData } from "../api/chartData";
import { formatDate } from "../utils/date";
import { Spinner } from "./Spinner";
import { RankHistoryChart } from "./RankHistoryChart";
import "./GameModal.css";
import * as React from "react";

interface Props {
  gameId: number;
  onClose: () => void;
  source?: "circana" | "famitsu";
}

export function GameModal({ gameId, onClose, source = "circana" }: Props) {
  const query = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId),
  });

  // Circana trend query — only active when NOT in famitsu mode
  const circanaQuery = useQuery({
    queryKey: ["game-trends", "circana", gameId],
    queryFn: () => fetchTrends(gameId),
    enabled: source !== "famitsu",
  });

  // Famitsu trend query — only active when in famitsu mode
  const famitsuTrendsQuery = useQuery({
    queryKey: ["game-trends", "famitsu", gameId],
    queryFn: () => fetchFamitsuTrends(gameId),
    enabled: source === "famitsu",
  });

  const trendsIsPending =
    source === "famitsu"
      ? famitsuTrendsQuery.isPending
      : circanaQuery.isPending;
  const trendsIsError =
    source === "famitsu" ? famitsuTrendsQuery.isError : circanaQuery.isError;

  // Build unified chart data based on source
  const chartContent = React.useMemo(() => {
    if (
      source === "famitsu" &&
      famitsuTrendsQuery.data &&
      famitsuTrendsQuery.data.length > 0
    ) {
      return buildFamitsuChartData(famitsuTrendsQuery.data);
    }
    if (
      source !== "famitsu" &&
      circanaQuery.data &&
      circanaQuery.data.length > 0
    ) {
      return buildCircanaChartData(circanaQuery.data);
    }
    return null;
  }, [source, famitsuTrendsQuery.data, circanaQuery.data]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  const game = query.data;
  const releaseDate = formatDate(game?.release_date_us);
  const igdbUrl =
    game?.igdb_id != null
      ? `https://www.igdb.com/search?q=${encodeURIComponent(game.title_en)}`
      : null;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal${chartContent ? " modal--wide" : ""}`}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {query.isPending && (
          <div className="modal__loading">
            <Spinner />
          </div>
        )}

        {query.isError && (
          <p className="modal__error">Failed to load game details.</p>
        )}

        {game && (
          <div className="modal__content">
            <div className="modal__cover">
              {game.cover_url ? (
                <img src={game.cover_url} alt={game.title_en} />
              ) : (
                <div className="modal__cover-placeholder" />
              )}
            </div>
            <div className="modal__info">
              <h2 className="modal__title">{game.title_en}</h2>
              {releaseDate && (
                <p className="modal__release">Released {releaseDate}</p>
              )}

              {(game.publisher || game.developer) && (
                <dl className="modal__details">
                  {game.publisher && (
                    <>
                      <dt>Publisher</dt>
                      <dd>{game.publisher}</dd>
                    </>
                  )}
                  {game.developer && (
                    <>
                      <dt>Developer</dt>
                      <dd>{game.developer}</dd>
                    </>
                  )}
                </dl>
              )}

              {igdbUrl && (
                <a
                  className="modal__igdb-link"
                  href={igdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on IGDB ↗
                </a>
              )}
            </div>
          </div>
        )}

        {game && (
          <div className="modal__chart-section">
            <p className="modal__chart-title">
              {source === "famitsu" ? "Famitsu Rank History" : "Rank History"}
            </p>
            {trendsIsPending && (
              <div className="modal__chart-loading">
                <Spinner />
              </div>
            )}
            {trendsIsError && (
              <p className="modal__chart-error">Could not load rank history.</p>
            )}
            {!chartContent && !trendsIsPending && (
              <p className="modal__chart-empty">No rank history available.</p>
            )}
            {chartContent && (
              <RankHistoryChart
                data={chartContent.points}
                series={chartContent.series}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
