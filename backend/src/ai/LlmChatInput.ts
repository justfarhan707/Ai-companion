import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ChatRequest } from "../types/chat.js";

export type LlmChatInput = {
	request: ChatRequest;
	liveState?: LiveStateTypes;
};
