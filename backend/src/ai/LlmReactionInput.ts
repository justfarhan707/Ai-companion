import type { ReactionIntent } from "../reactions/ReactionIntent.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";

export type LlmReactionInput = {
	playerName: string;
	state: LiveStateTypes;
	intent: ReactionIntent;
	relevantMemories?: MemoryRecord[];
};
