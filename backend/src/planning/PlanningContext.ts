import type { ChatRequest } from "../types/chat.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { YuriToolDefinition } from "../actions/YuriToolRegistry.js";

export type PlanningContext = {
	request: ChatRequest;
	liveState?: LiveStateTypes;
	relevantMemories: MemoryRecord[];
	recentMessages: ConversationMessage[];
	availableActions: YuriToolDefinition[];
};
