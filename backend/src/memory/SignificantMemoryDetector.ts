import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "./MemoryRecord.js";

const HOSTILE_MOBS = new Set([
	"Zombie",
	"Skeleton",
	"Creeper",
	"Spider",
	"Enderman",
	"Witch",
	"Drowned",
	"Husk",
	"Stray",
]);

export class SignificantMemoryDetector {
    	detect(state: LiveStateTypes): MemoryRecord[] {
    		const hostiles = state.nearby.entities.filter((entity) => HOSTILE_MOBS.has(entity));
    		const memories: MemoryRecord[] = [];

    		if ((state.health ?? 20) <= 4 && hostiles.length > 0) {
    			memories.push({
    				id: crypto.randomUUID(),
    				playerName: state.player.name,
    				type: "near_death",
    				summary: `${state.player.name} nearly died while hostile mobs were nearby.`,
    				tags: ["danger", "near_death", "hostile_mobs"],
    				location: {
    					world: state.player.world,
    					x: state.player.x,
    					y: state.player.y,
    					z: state.player.z,
    				},
    				importance: 0.9,
    				evidence: {
    					health: state.health,
    					hostiles,
    					danger: state.danger,
    				},
    				createdAt: new Date().toISOString(),
    			});
    		}

    		return memories;
    	}
    }