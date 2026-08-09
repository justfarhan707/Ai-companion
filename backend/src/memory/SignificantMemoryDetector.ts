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

const LAVA_BLOCKS = new Set([
	"Lava",
	"Lava Block",
]);

const CAVE_BLOCKS = new Set([
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

export class SignificantMemoryDetector {
	detect(state: LiveStateTypes): MemoryRecord[] {
		const hostiles = state.nearby.entities.filter((entity) => HOSTILE_MOBS.has(entity));
		const blockNames = state.nearby.blocks.map((block) => block.name);
		const memories: MemoryRecord[] = [];
		const now = new Date().toISOString();
		const isDeepUnderground = state.player.y <= 45;
		const caveLikeBlocks = blockNames.filter((block) => CAVE_BLOCKS.has(block));
		const lavaNearby = blockNames.some((block) => LAVA_BLOCKS.has(block));
		const rareBlocks = blockNames.filter((block) => RARE_BLOCKS.has(block));

		if ((state.health ?? 20) <= 0) {
			memories.push(this.createMemory({
				state,
				now,
				type: "death",
				summary: `${state.player.name} died while exploring.`,
				tags: ["death", "danger"],
				importance: 1,
				confidence: 0.95,
				evidence: {
					health: state.health,
					hostiles,
					blocks: blockNames,
					danger: state.danger,
				},
			}));
		}

		if ((state.health ?? 20) <= 4 && hostiles.length > 0) {
			memories.push(this.createMemory({
				state,
				now,
				type: "near_death",
				summary: `${state.player.name} nearly died while hostile mobs were nearby.`,
				tags: ["danger", "near_death", "hostile_mobs"],
				importance: 0.9,
				confidence: 0.85,
				evidence: {
					health: state.health,
					hostiles,
					danger: state.danger,
				},
			}));
		}

		if (lavaNearby) {
			memories.push(this.createMemory({
				state,
				now,
				type: "lava_danger",
				summary: `${state.player.name} was near lava while exploring.`,
				tags: ["danger", "lava", "cave"],
				importance: 0.75,
				confidence: 0.8,
				evidence: {
					health: state.health,
					blocks: blockNames,
					danger: state.danger,
				},
			}));
		}

		if (isDeepUnderground && caveLikeBlocks.length > 0) {
			memories.push(this.createMemory({
				state,
				now,
				type: "entered_cave",
				summary: `${state.player.name} spent time underground in a cave-like area.`,
				tags: ["cave", "underground", "exploration"],
				importance: 0.45,
				confidence: 0.7,
				evidence: {
					y: state.player.y,
					blocks: caveLikeBlocks,
				},
			}));
		}

		for (const rareBlock of rareBlocks) {
			memories.push(this.createMemory({
				state,
				now,
				type: "discovery",
				summary: `${state.player.name} found ${rareBlock}.`,
				tags: ["discovery", "rare_block", "mining", rareBlock.toLowerCase().replaceAll(" ", "_")],
				importance: 0.85,
				confidence: 0.9,
				evidence: {
					block: rareBlock,
					y: state.player.y,
				},
			}));
		}

		return memories;
	}

	private createMemory(input: {
		state: LiveStateTypes;
		now: string;
		type: MemoryRecord["type"];
		summary: string;
		tags: string[];
		importance: number;
		confidence: number;
		evidence: Record<string, unknown>;
	}): MemoryRecord {
		return {
			id: crypto.randomUUID(),
			playerName: input.state.player.name,
			type: input.type,
			summary: input.summary,
			tags: input.tags,
			location: {
				world: input.state.player.world,
				x: input.state.player.x,
				y: input.state.player.y,
				z: input.state.player.z,
			},
			importance: input.importance,
			confidence: input.confidence,
			reinforcementCount: 1,
			recallCount: 0,
			evidence: input.evidence,
			createdAt: input.now,
			lastUpdatedAt: input.now,
		};
	}
}
