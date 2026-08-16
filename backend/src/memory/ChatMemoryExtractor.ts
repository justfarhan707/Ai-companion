import type { ChatRequest } from "../types/chat.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import type { MemoryExtractorProvider } from "./extraction/MemoryExtractorProvider.js";
import { MemoryCandidateGuard } from "./MemoryCandidateGuard.js";
import { MemoryNormalizer } from "./MemoryNormalizer.js";

//will store the returened candidates properly in sqlite

export class ChatMemoryExtractor {
	private readonly guard = new MemoryCandidateGuard();
	private readonly normalizer = new MemoryNormalizer();

	constructor(private readonly provider: MemoryExtractorProvider) {
	}
	async extract(input: {
		request: ChatRequest;
		yuriReply: string;
		recentMessages: ConversationMessage[];
	}): Promise<MemoryRecord[]> {
		const candidates = await this.provider.extract(input);
		const now = new Date().toISOString();

		return candidates
			.filter((candidate) => candidate.shouldRemember)
			.map((candidate) => {
				const memory: MemoryRecord = {
					id: crypto.randomUUID(),
					playerName: input.request.player.name,
					type: candidate.type,
					summary: candidate.summary,
					tags: candidate.tags,
					location: {
						world: input.request.player.world,
						x: input.request.player.x,
						y: input.request.player.y,
						z: input.request.player.z,
					},
					importance: candidate.importance,
					confidence: candidate.confidence,
					reinforcementCount: 1,
					recallCount: 0,
					evidence: {
						playerMessage: input.request.message,
						yuriReply: input.yuriReply,
					},
					createdAt: now,
					lastUpdatedAt: now,
				};

				return this.normalizer.normalize(memory);
			})
			.filter((memory) => this.guard.shouldStore(memory));

	}
}