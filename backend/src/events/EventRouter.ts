import type { GameEvent } from "../types/events.js";
 import { LiveStateStore } from "../state/LiveStateStore.js";

 export class EventRouter {
 	constructor(private readonly liveStateStore: LiveStateStore) {
 	}

 	handle(event: GameEvent) {
 		switch (event.type) {
 			case "PlayerStateUpdated":
 				return this.liveStateStore.updateFromPlayerState(event);
 		}
 	}
 }