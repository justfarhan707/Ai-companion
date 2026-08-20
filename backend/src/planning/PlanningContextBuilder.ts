
//build a context and tell available actions to gemini
import type { ChatRequest } from "../types/chat.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { PlanningContext } from "./PlanningContext.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import { YuriToolRegistry } from "../actions/YuriToolRegistry.js";

export class PlanningContextBuilder {
	private readonly toolRegistry = new YuriToolRegistry();

	build(input: {
		request: ChatRequest;
		liveState?: LiveStateTypes;
		relevantMemories: MemoryRecord[];
		recentMessages: ConversationMessage[];
	}): PlanningContext {
		return {
			request: input.request,
			liveState: input.liveState,
			relevantMemories: input.relevantMemories,
			recentMessages: input.recentMessages,
			availableActions: this.toolRegistry.getAvailableTools(),
		};
	}
}
