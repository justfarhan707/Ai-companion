import type { ChatRequest } from "../types/chat.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";

export type LlmChatInput = {
	request: ChatRequest;
	liveState?: LiveStateTypes;
	relevantMemories?: MemoryRecord[];
};