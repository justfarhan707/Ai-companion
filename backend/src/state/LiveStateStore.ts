import type { PlayerStateUpdatedEvent } from "../types/events.js";
import type { LiveStateTypes, DangerLevel } from "./LiveStateTypes.js";

export class LiveStateStore {
	private readonly states = new Map<string, LiveStateTypes>();

	updateFromPlayerState(event: PlayerStateUpdatedEvent): LiveStateTypes {
		const state: LiveStateTypes = {
			player: event.player,
			nearby: event.nearby,
			health: event.health,
			gameTime: event.gameTime,
			danger: this.estimateDanger(event),
			updatedAt: new Date().toISOString(),
		};

		this.states.set(event.player.name, state);
		return state;
	}

	get(playerName: string): LiveStateTypes | undefined {
		return this.states.get(playerName);
	}

	private estimateDanger(event: PlayerStateUpdatedEvent): DangerLevel {
		const hostiles = ["Zombie", "Skeleton", "Creeper", "Spider", "Enderman"];
		const hostileCount = event.nearby.entities.filter((entity) => hostiles.includes(entity)).length;

		if ((event.health ?? 20) <= 6 || event.nearby.entities.includes("Creeper")) {
			return "high";
		}

		if (hostileCount >= 2) {
			return "medium";
		}

		if (hostileCount === 1) {
			return "low";
		}

		return "none";
	}
}
