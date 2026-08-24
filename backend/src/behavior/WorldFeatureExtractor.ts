
//wats nearby me or player
import type { LiveStateTypes } from "../state/LiveStateTypes.js";

export type WorldFeatures = {
	isUnderground: boolean;
	isCaveLike: boolean;
	hasLava: boolean;
	hasVillageSignals: boolean;
	hasPassiveAnimals: boolean;
	hasRareBlocks: boolean;
	hasHostiles: boolean;
	isHungry: boolean;
	isLowHealth: boolean;
	nearbyBlocks: string[];
	nearbyEntities: string[];
};

const CAVE_BLOCKS = new Set([
	"Stone",
	"Deepslate",
	"Tuff",
	"Dripstone Block",
	"Iron Ore",
	"Coal Ore",
	"Copper Ore",
	"Diamond Ore",
	"Deepslate Diamond Ore",
]);

const VILLAGE_ENTITIES = new Set([
	"Villager",
	"Iron Golem",
]);

const PASSIVE_ANIMALS = new Set([
	"Pig",
	"Cow",
	"Chicken",
	"Sheep",
	"Rabbit",
]);

const RARE_BLOCKS = new Set([
	"Diamond Ore",
	"Deepslate Diamond Ore",
	"Emerald Ore",
	"Deepslate Emerald Ore",
	"Ancient Debris",
]);


export class WorldFeatureExtractor {
	extract(state: LiveStateTypes): WorldFeatures {
		const nearbyBlocks = state.nearby.blocks.map((block) => block.name);
		const nearbyEntities = state.nearby.entities;

		return {
			isUnderground: state.player.y <= 45,
			isCaveLike: nearbyBlocks.some((block) => CAVE_BLOCKS.has(block)),
			hasLava: nearbyBlocks.includes("Lava"),
			hasVillageSignals: nearbyEntities.some((entity) => VILLAGE_ENTITIES.has(entity)),
			hasPassiveAnimals: nearbyEntities.some((entity) => PASSIVE_ANIMALS.has(entity)),
			hasRareBlocks: nearbyBlocks.some((block) => RARE_BLOCKS.has(block)),
			hasHostiles: state.danger !== "none",
			isHungry: (state.hunger ?? 20) <= 10,
			isLowHealth: (state.health ?? 20) <= 6,
			nearbyBlocks,
			nearbyEntities,
		};
	}
}