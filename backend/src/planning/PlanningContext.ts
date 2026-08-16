import type { ChatRequest } from "../types/chat.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";

export type PlanningContext = {
	request: ChatRequest;
	liveState?: LiveStateTypes;
	relevantMemories: MemoryRecord[];
	recentMessages: ConversationMessage[];
	availableActions: Array<{
		type: string;
		description: string;
		requiresApproval: boolean;
	}>;
};