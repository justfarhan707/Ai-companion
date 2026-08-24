import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { BehaviorObservation } from "./BehaviorObservation.js";
import type { BehaviorReflection } from "./BehaviorReflection.js";

export class BehaviorMemoryWriter {
	toMemory(input: {
		playerName: string;
		reflection: BehaviorReflection;
		observations: BehaviorObservation[];
	}): MemoryRecord | undefined {
		if (!input.reflection.learned || !input.reflection.summary) {
			return undefined;
		}

		const now = new Date().toISOString();
		const latestObservation = input.observations[input.observations.length - 1];
		const tags = new Set([
			"playstyle",
			...(input.reflection.tags ?? []),
		]);

   		return {
   			id: crypto.randomUUID(),
   			playerName: input.playerName,
   			type: "playstyle",
   			summary: input.reflection.summary,
   			tags: [...tags],
   			location: {
   				world: String(latestObservation?.context.world ?? "unknown"),
   				x: Number(latestObservation?.context.x ?? 0),
   				y: Number(latestObservation?.context.y ?? 0),
   				z: Number(latestObservation?.context.z ?? 0),
   			},
   			importance: input.reflection.importance ?? 0.65,
   			confidence: input.reflection.confidence ?? 0.65,
   			reinforcementCount: 1,
   			recallCount: 0,
   			evidence: {
   				source: "behavior_reflection",
   				evidenceIds: input.reflection.evidenceIds ?? input.observations.map((observation) => observation.id),
   				observationCount: input.observations.length,
   			},
   			createdAt: now,
   			lastUpdatedAt: now,
   		};
   	}
   }