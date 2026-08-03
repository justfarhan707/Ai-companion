import type { ChatRequest, ChatResponse } from "../types/chat.js";

export interface LlmProvider {
    chat(request: ChatRequest): Promise<ChatResponse>;
}
