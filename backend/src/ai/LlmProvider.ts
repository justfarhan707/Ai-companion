import type { ChatResponse } from "../types/chat.js";
import type { PlannedResponse } from "../planning/PlannedResponse.js";
import type { PlanningContext } from "../planning/PlanningContext.js";
import type { LlmChatInput } from "./LlmChatInput.js";
import type { LlmReactionInput } from "./LlmReactionInput.js";

export interface LlmProvider {
	chat(input: LlmChatInput): Promise<ChatResponse>;
	react(input: LlmReactionInput): Promise<ChatResponse>;
	plan(input: PlanningContext): Promise<PlannedResponse>;
}
