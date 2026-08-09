import type { InventorySummary, NearbyContext, PlayerContext } from "./chat.js";

export type PlayerStateUpdatedEvent = {
	type: "PlayerStateUpdated";
	player: PlayerContext;
	nearby: NearbyContext;
	health?: number;
	hunger?: number;
	selectedItem?: string;
	inventory?: InventorySummary;
	gameTime?: number;
};

export type GameEvent = PlayerStateUpdatedEvent;
