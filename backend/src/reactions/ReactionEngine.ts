import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ReactionIntent } from "./ReactionIntent.js";

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

const PASSIVE_MOBS = new Set([
	"Horse",
	"Pig",
	"Cow",
	"Sheep",
	"Chicken",
	"Rabbit",
	"Villager",
	"Cat",
	"Dog",
	"Wolf",
	"Bee",
	"Goat",
	"Camel",
	"Donkey",
	"Llama",
]);

const HUNTABLE_FOOD_ANIMALS = new Set([
	"Pig",
	"Cow",
	"Chicken",
	"Sheep",
	"Rabbit",
]);

const LAVA_BLOCKS = new Set([
	"Lava",
	"Lava Block",
]);

const UNDERGROUND_BLOCKS = new Set([
	"Stone",
	"Deepslate",
	"Tuff",
	"Dripstone Block",
]);

const RARE_BLOCKS = new Set([
	"Diamond Ore",
	"Deepslate Diamond Ore",
	"Ancient Debris",
	"Emerald Ore",
	"Deepslate Emerald Ore",
]);

export class ReactionEngine {
	evaluate(state: LiveStateTypes): ReactionIntent[] {
		const intents: ReactionIntent[] = [];
		const hostileMobs = state.nearby.entities.filter((entity) => HOSTILE_MOBS.has(entity));
		const passiveMobs = state.nearby.entities.filter((entity) => PASSIVE_MOBS.has(entity));
		const blockNames = state.nearby.blocks.map((block) => block.name);

		const nearbyHuntableAnimals = state.nearby.entityDetails
			?.filter((entity) => HUNTABLE_FOOD_ANIMALS.has(entity.name))
			.sort((a, b) => a.distance - b.distance) ?? [];

		const closestHuntableAnimal = nearbyHuntableAnimals[0];
		const hunger = state.hunger ?? 20;
		const totalFoodCount = state.inventory?.totalFoodCount ?? 0;
		const shouldProposeHunting =
			hunger <= 8 &&
			totalFoodCount === 0 &&
			closestHuntableAnimal !== undefined &&
			closestHuntableAnimal.distance <= 10;

		const lavaNearby = blockNames.some((block) => LAVA_BLOCKS.has(block));
		const rareBlocks = blockNames.filter((block) => RARE_BLOCKS.has(block));
		const isUnderground = state.player.y <= 45;
		const caveLike = blockNames.some((block) => UNDERGROUND_BLOCKS.has(block));

		if (hostileMobs.includes("Creeper")) {
			intents.push({
				kind: "speak",
				urgency: "critical",
				source: "danger",
				reason: "CREEPER_NEARBY",
				intent: "Warn the player immediately about a creeper nearby.",
				context: {
					hostileMobs,
					health: state.health,
				},
				useLlm: false,
				text: "Creeper!",
			});
		}

		if (hostileMobs.length > 0 && (state.health ?? 20) <= 6) {
			intents.push({
				kind: "speak",
				urgency: "high",
				source: "danger",
				reason: "PLAYER_LOW_HEALTH_WITH_HOSTILES",
				intent: "Yuri urgently warns the player that they are hurt while hostile mobs are nearby.",
				context: {
					hostileMobs,
					health: state.health,
				},
				useLlm: true,
			});
		}

		if (hostileMobs.length > 0 && state.danger !== "high") {
			intents.push({
				kind: "speak",
				urgency: "medium",
				source: "danger",
				reason: "HOSTILE_MOBS_NEARBY",
				intent: "Yuri notices hostile mobs nearby and warns the player without panicking.",
				context: {
					hostileMobs,
					health: state.health,
				},
				useLlm: true,
			});
		}

		if (shouldProposeHunting) {
			intents.push({
				kind: "speak",
				urgency: "high",
				source: "need",
				reason: "LOW_FOOD_WITH_HUNTABLE_ANIMAL",
				intent: "Yuri notices the player is low on hunger, has no food, and there is a nearby animal that could provide food. Yuri should ask permission before hunting.",
				context: {
					hunger,
					totalFoodCount,
					targetAnimal: closestHuntableAnimal.name,
					targetDistance: closestHuntableAnimal.distance,
				},
				useLlm: true,
			});
		}

		if (!shouldProposeHunting && passiveMobs.length > 0 && hostileMobs.length === 0) {
			intents.push({
				kind: "speak",
				urgency: "medium",
				source: "environment",
				reason: "PASSIVE_MOBS_NEARBY",
				intent: "Yuri notices passive animals or friendly creatures nearby and reacts naturally.",
				context: {
					passiveMobs,
				},
				useLlm: true,
			});
		}

		if (lavaNearby) {
			intents.push({
				kind: "speak",
				urgency: "high",
				source: "environment",
				reason: "LAVA_NEARBY",
				intent: "Yuri notices lava nearby and warns the player carefully, especially if there are memories involving lava or caves.",
				context: {
					blocks: blockNames,
					health: state.health,
				},
				useLlm: true,
			});
		}

		if (isUnderground && caveLike) {
			intents.push({
				kind: "speak",
				urgency: "medium",
				source: "environment",
				reason: "UNDERGROUND_EXPLORATION",
				intent: "Yuri notices that the player is underground and reacts naturally to cave exploration.",
				context: {
					y: state.player.y,
					blocks: blockNames,
				},
				useLlm: true,
			});
		}

		if (rareBlocks.length > 0) {
			intents.push({
				kind: "speak",
				urgency: "medium",
				source: "discovery",
				reason: "RARE_BLOCK_NEARBY",
				intent: "Yuri notices a rare block nearby and reacts with excitement.",
				context: {
					rareBlocks,
				},
				useLlm: true,
			});
		}

		return intents;
	}
}
