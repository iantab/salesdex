import { apiFetch } from "./client";
import type { GameDetail, IgdbDetail } from "./types";

export const fetchGame = (id: number) =>
  apiFetch<{ data: GameDetail }>(`/games/${id}`).then((r) => r.data);

export const fetchGameIgdb = (gameId: number) =>
  apiFetch<{ data: IgdbDetail }>(`/games/${gameId}/igdb`).then((r) => r.data);
