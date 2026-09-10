import type { getGameView } from "@/lib/game.functions";

export type GameView = Awaited<ReturnType<typeof getGameView>>;
export type Player = GameView["players"][number];
