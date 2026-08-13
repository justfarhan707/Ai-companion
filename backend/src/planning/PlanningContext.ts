import type { ChatRequest } from "../types/chat.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";

export type PlanningContext = {
	request: ChatRequest;
	liveState?: LiveStateTypes;
	relevantMemories: MemoryRecord[];
	availableActions: Array<{
		type: string;
		description: string;
		requiresApproval: boolean;
	}>;
};