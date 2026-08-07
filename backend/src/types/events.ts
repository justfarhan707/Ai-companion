import type { NearbyContext, PlayerContext } from "./chat.js";

export type PlayerStateUpdatedEvent = {
	type: "PlayerStateUpdated";
	player: PlayerContext;
	nearby: NearbyContext;
	health?: number;
	gameTime?: number;
};

export type GameEvent = PlayerStateUpdatedEvent;
