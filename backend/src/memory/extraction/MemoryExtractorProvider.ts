//good ol interface
import type { ConversationMessage } from "../../conversation/ConversationMessage.js";
import type { ChatRequest } from "../../types/chat.js";
import type { ExtractedMemoryCandidate } from "./ExtractedMemoryCandidate.js";

export type MemoryExtractionInput = {
	request: ChatRequest;
	yuriReply: string;
	recentMessages: ConversationMessage[];
};

export interface MemoryExtractorProvider {
	extract(input: MemoryExtractionInput): Promise<ExtractedMemoryCandidate[]>;
}