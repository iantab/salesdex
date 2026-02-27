import { useQuery } from "@tanstack/react-query";
import { fetchGame, fetchGameIgdb } from "../api/games";
import { Spinner } from "./Spinner";
import "./GameModal.css";

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

  const igdbQuery = useQuery({
    queryKey: ["game-igdb", gameId],
    queryFn: () => fetchGameIgdb(gameId),
    enabled: query.data?.igdb_id != null,
    retry: false,
  });

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  const game = query.data;
  const igdb = igdbQuery.data;

  const igdbUrl = igdb?.slug
    ? `https://www.igdb.com/games/${igdb.slug}`
    : game?.igdb_id != null
      ? `https://www.igdb.com/search?q=${encodeURIComponent(game.title_en)}`
      : null;

  const releaseDate = formatDate(game?.release_date_us);
  const releaseDateJp = formatDate(igdb?.release_date_jp);

  const showJpTitle = igdb?.title_jp && igdb.title_jp !== game?.title_en;
  const showJpDate = releaseDateJp && releaseDateJp !== releaseDate;

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal">
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

              {igdbQuery.isPending && game.igdb_id != null && (
                <div className="modal__igdb-loading">
                  <Spinner />
                </div>
              )}

              {igdb && (
                <dl className="modal__details">
                  {igdb.developer && (
                    <>
                      <dt>Developer</dt>
                      <dd>{igdb.developer}</dd>
                    </>
                  )}
                  {igdb.franchise && (
                    <>
                      <dt>Franchise</dt>
                      <dd>{igdb.franchise}</dd>
                    </>
                  )}
                  {showJpTitle && (
                    <>
                      <dt>JP Title</dt>
                      <dd>{igdb.title_jp}</dd>
                    </>
                  )}
                  {showJpDate && (
                    <>
                      <dt>JP Release</dt>
                      <dd>{releaseDateJp}</dd>
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
      </div>
    </div>
  );
}
