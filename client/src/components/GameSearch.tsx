import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGameSearch } from "../api/games";
import { useDebounce } from "../hooks/useDebounce";
import { GameModal } from "./GameModal";
import { Spinner } from "./Spinner";
import "./GameSearch.css";

export function GameSearch() {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const debouncedQuery = useDebounce(inputValue, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dropdownVisible = isFocused && debouncedQuery.length >= 2;

  const searchQuery = useQuery({
    queryKey: ["game-search", debouncedQuery],
    queryFn: () => fetchGameSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const results = searchQuery.data ?? [];

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  // Close dropdown on outside mousedown (fires before blur so clicks register)
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selectGame = useCallback((id: number) => {
    setSelectedGameId(id);
    setInputValue("");
    setIsFocused(false);
    setActiveIndex(-1);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownVisible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        selectGame(results[activeIndex].id);
      }
    } else if (e.key === "Escape") {
      setInputValue("");
      setIsFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  return (
    <>
      <div className="game-search" ref={containerRef}>
        <label className="sr-only" htmlFor="game-search-input">
          Search games
        </label>
        <input
          id="game-search-input"
          ref={inputRef}
          className="game-search__input"
          type="search"
          placeholder="Search games…"
          value={inputValue}
          autoComplete="off"
          role="combobox"
          aria-expanded={dropdownVisible}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="game-search-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `game-search-option-${activeIndex}` : undefined
          }
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />

        {dropdownVisible && (
          <div className="game-search__dropdown">
            {searchQuery.isPending && (
              <div className="game-search__status">
                <Spinner /> Searching…
              </div>
            )}
            {searchQuery.isError && (
              <div className="game-search__status game-search__status--error">
                Search failed
              </div>
            )}
            {searchQuery.isSuccess && results.length === 0 && (
              <div className="game-search__status">No results</div>
            )}
            {results.length > 0 && (
              <ul
                id="game-search-listbox"
                className="game-search__list"
                role="listbox"
                aria-label="Search results"
              >
                {results.map((game, i) => (
                  <li
                    key={game.id}
                    id={`game-search-option-${i}`}
                    className={`game-search__item${i === activeIndex ? " game-search__item--active" : ""}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={() => selectGame(game.id)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {game.cover_url ? (
                      <img
                        className="game-search__thumb"
                        src={game.cover_url}
                        alt=""
                        aria-hidden="true"
                      />
                    ) : (
                      <div
                        className="game-search__thumb-placeholder"
                        aria-hidden="true"
                      />
                    )}
                    <span className="game-search__title">{game.title_en}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {selectedGameId !== null && (
        <GameModal
          gameId={selectedGameId}
          onClose={() => setSelectedGameId(null)}
        />
      )}
    </>
  );
}
