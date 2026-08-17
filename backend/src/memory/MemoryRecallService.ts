//this file is how Yuri decides what to remember right now
//this file will handle recall logics while lon term memory store will just fetch and store memories

import type { ChatRequest } from "../types/chat.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import { LongTermMemoryStore } from "./LongTermMemoryStore.js";
import { MessageMemoryTagger } from "./MessageMemoryTagger.js";
import { MemoryQueryBuilder } from "./MemoryQueryBuilder.js";
import type { EmbeddingProvider } from "./embedding/EmbeddingProvider.js";

export type MemoryRecallInput = {
	playerName: string;
	message: string;
	request?: ChatRequest;
	liveState?: LiveStateTypes;
	recentMessages?: ConversationMessage[];
	limit?: number;
};

export type MemoryRecallDebugItem = {
	memoryId: string;
	summary: string;
	score: number;
	semanticScore: number;
	tagScore: number;
	reasons: string[];
};

export type MemoryRecallResult = {
	memories: MemoryRecord[];
	debug: MemoryRecallDebugItem[];
	queryText: string;
	tags: string[];
	candidateCount: number;
};

export class MemoryRecallService {
	private readonly queryBuilder = new MemoryQueryBuilder();

	constructor(
		private readonly longTermMemoryStore: LongTermMemoryStore,
		private readonly messageMemoryTagger: MessageMemoryTagger,
		private readonly embeddingProvider?: EmbeddingProvider,
	) {
	}

	async recall(input: MemoryRecallInput): Promise<MemoryRecallResult> {
		const queryText = this.queryBuilder.build(input);
		const tags = this.inferTags(input, queryText);

		if (!this.embeddingProvider) {
			return this.recallByTags(input, queryText, tags);
		}

		try {
			const queryEmbedding = await this.embeddingProvider.embedText(
				queryText,
				"RETRIEVAL_QUERY",
			);

			return this.recallHybrid(input, queryText, tags, queryEmbedding);
		} catch (error) {
			const fallback = this.recallByTags(input, queryText, tags);

			return {
				...fallback,
				debug: fallback.debug.map((item) => ({
					...item,
					reasons: [...item.reasons, "embedding_failed_fallback"],
				})),
			};
		}
	}

	private recallHybrid(
		input: MemoryRecallInput,
		queryText: string,
		tags: string[],
		queryEmbedding: number[],
	): MemoryRecallResult {
		const candidates = this.longTermMemoryStore.getRecallCandidates(
			input.playerName,
			500,
		);

		const scored = candidates
			.map((memory) => {
				const semanticScore = memory.embedding
					? this.cosineSimilarity(queryEmbedding, memory.embedding)
					: 0;

				const tagScore = this.calculateTagScore(memory, tags);
				const reinforcementBoost = Math.min(memory.reinforcementCount * 0.03, 0.15);

				const score =
					semanticScore * 0.65 +
					tagScore * 0.2 +
					memory.importance * 0.1 +
					memory.confidence * 0.05 +
					reinforcementBoost;

				return {
					memory,
					score,
					semanticScore,
					tagScore,
					reasons: this.explainRecall(memory, tags, semanticScore, tagScore),
				};
			})
			.filter((result) =>
				result.semanticScore >= 0.55 ||
				result.tagScore > 0
			)
			.sort((a, b) => b.score - a.score)
			.slice(0, input.limit ?? 5);

		const memories = scored.map((result) => result.memory);


		this.longTermMemoryStore.markMemoriesRecalled(memories);

		return {
			memories,
			debug: scored.map((result) => ({
				memoryId: result.memory.id,
				summary: result.memory.summary,
				score: this.roundScore(result.score),
				semanticScore: this.roundScore(result.semanticScore),
				tagScore: this.roundScore(result.tagScore),
				reasons: result.reasons,
			})),
			queryText,
			tags,
			candidateCount: candidates.length,
		};
	}

	private recallByTags(
		input: MemoryRecallInput,
		queryText: string,
		tags: string[],
	): MemoryRecallResult {
		const memories = this.longTermMemoryStore.findRelevant(
			input.playerName,
			tags,
			input.limit ?? 5,
		);

		return {
			memories,
			debug: memories.map((memory) => {
				const tagScore = this.calculateTagScore(memory, tags);

				return {
					memoryId: memory.id,
					summary: memory.summary,
					score: tagScore,
					semanticScore: 0,
					tagScore,
					reasons: this.explainRecall(memory, tags, 0, tagScore),
				};
			}),
			queryText,
			tags,
			candidateCount: memories.length,
		};
	}

	private calculateTagScore(memory: MemoryRecord, tags: string[]): number {
		if (tags.length === 0) {
			return 0;
		}

		let matched = 0;

		for (const tag of tags) {
			if (memory.tags.includes(tag)) {
				matched += 1;
			}
		}

		return matched / tags.length;
	}

	private cosineSimilarity(a: number[], b: number[]): number {
		if (a.length === 0 || b.length === 0 || a.length !== b.length) {
			return 0;
		}

		let dot = 0;
		let normA = 0;
		let normB = 0;

		for (let index = 0; index < a.length; index++) {
			dot += a[index] * b[index];
			normA += a[index] * a[index];
			normB += b[index] * b[index];
		}

		if (normA === 0 || normB === 0) {
			return 0;
		}

		return dot / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	private roundScore(score: number): number {
		return Math.round(score * 1000) / 1000;
	}



	private inferTags(input: MemoryRecallInput, queryText: string): string[] {
		const tags = new Set<string>();

		for (const tag of this.messageMemoryTagger.inferTags(input.message)) {
			tags.add(tag);
		}

		for (const tag of this.messageMemoryTagger.inferTags(queryText)) {
			tags.add(tag);
		}

		return [...tags];
	}




	private explainRecall(
		memory: MemoryRecord,
		tags: string[],
		semanticScore: number,
		tagScore: number,
	): string[] {
		const reasons: string[] = [];

		const matchedTags = memory.tags.filter((tag) => tags.includes(tag));

		if (matchedTags.length > 0) {
			reasons.push(`matched_tags:${matchedTags.join(",")}`);
		}

		if (semanticScore >= 0.55) {
			reasons.push("semantic_match");
		}

		if (tagScore > 0) {
			reasons.push("tag_match");
		}

		if (memory.importance >= 0.8) {
			reasons.push("high_importance");
		}

		if (memory.reinforcementCount > 1) {
			reasons.push(`reinforced:${memory.reinforcementCount}`);
		}

		return reasons;

	}
}
