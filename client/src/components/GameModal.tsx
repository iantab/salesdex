import { useQuery } from "@tanstack/react-query";
import { fetchGame } from "../api/games";
import { fetchTrends } from "../api/circana";
import { Spinner } from "./Spinner";
import { RankHistoryChart } from "./RankHistoryChart";
import "./GameModal.css";
import * as React from "react";

interface Props {
  gameId: number;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function GameModal({ gameId, onClose }: Props) {
  const query = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId),
  });

  const trendsQuery = useQuery({
    queryKey: ["game-trends", gameId],
    queryFn: () => fetchTrends(gameId),
  });

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  const game = query.data;

  const igdbUrl =
    game?.igdb_id != null
      ? `https://www.igdb.com/search?q=${encodeURIComponent(game.title_en)}`
      : null;

  const releaseDate = formatDate(game?.release_date_us);

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal${trendsQuery.data?.length ? " modal--wide" : ""}`}>
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
            <p className="modal__chart-title">Rank History</p>
            {trendsQuery.isPending && (
              <div className="modal__chart-loading">
                <Spinner />
              </div>
            )}
            {trendsQuery.isError && (
              <p className="modal__chart-error">Could not load rank history.</p>
            )}
            {trendsQuery.data?.length === 0 && (
              <p className="modal__chart-empty">No rank history available.</p>
            )}
            {trendsQuery.data && trendsQuery.data.length > 0 && (
              <RankHistoryChart data={trendsQuery.data} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
