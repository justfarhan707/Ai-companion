import type { NearbyContext, PlayerContext } from "../types/chat.js";

export type DangerLevel = "none" | "low" | "medium" | "high";

export type LiveStateTypes = {
	player: PlayerContext;
	nearby: NearbyContext;
	health?: number;
	gameTime?: number;
	danger: DangerLevel;
	updatedAt: string;
};