import { apiFetch } from "./client";
import type { GameDetail, GameSearchResult } from "./types";

export const fetchGame = (id: number) =>
  apiFetch<{ data: GameDetail }>(`/games/${id}`).then((r) => r.data);

export const fetchGameSearch = (query: string) =>
  apiFetch<{ data: GameSearchResult[] }>(
    `/games?search=${encodeURIComponent(query)}&pageSize=8`,
  ).then((r) => r.data);
