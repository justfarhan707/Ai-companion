import type { InventorySummary, NearbyContext, PlayerContext } from "../types/chat.js";

export type DangerLevel = "none" | "low" | "medium" | "high";

export type LiveStateTypes = {
	player: PlayerContext;
	nearby: NearbyContext;
	health?: number;
	hunger?: number;
	selectedItem?: string;
	inventory?: InventorySummary;
	gameTime?: number;
	danger: DangerLevel;
	updatedAt: string;
};
