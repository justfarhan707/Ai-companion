//this file is how Yuri decides what to remember right now
//this file will handle recall logics while lon term memory store will just fetch and store memories

import type { ChatRequest } from "../types/chat.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import { LongTermMemoryStore } from "./LongTermMemoryStore.js";
import { MessageMemoryTagger } from "./MessageMemoryTagger.js";
import { MemoryQueryBuilder, type MemoryQuery } from "./MemoryQueryBuilder.js";
import type { EmbeddingProvider } from "./embedding/EmbeddingProvider.js";
import type { MemoryVectorIndex } from "./vector/MemoryVectorIndex.js";

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
	typeScore: number;
	reasons: string[];
};

export type MemoryRecallResult = {
	memories: MemoryRecord[];
	debug: MemoryRecallDebugItem[];
	queryText: string;
	tags: string[];
	candidateCount: number;
	vectorResultCount: number;
	query: MemoryQuery;
};

export class MemoryRecallService {
	private readonly queryBuilder = new MemoryQueryBuilder();

	constructor(
		private readonly longTermMemoryStore: LongTermMemoryStore,
		private readonly messageMemoryTagger: MessageMemoryTagger,
		private readonly embeddingProvider?: EmbeddingProvider,
		private readonly vectorIndex?: MemoryVectorIndex,
	) {
	}

	async recall(input: MemoryRecallInput): Promise<MemoryRecallResult> {
		const query = this.queryBuilder.build(input);
		const queryText = query.text;
		const tags = this.inferTags(input, queryText);

		if (!this.embeddingProvider) {
			return this.recallByTags(input, query, tags);
		}

		try {
			const queryEmbedding = await this.embeddingProvider.embedText(
				queryText,
				"RETRIEVAL_QUERY",
			);

			return await this.recallHybrid(input, query, tags, queryEmbedding);
		} catch (error) {
			const fallback = this.recallByTags(input, query, tags);
			return {
				...fallback,
				debug: fallback.debug.map((item) => ({
					...item,
					reasons: [...item.reasons, "embedding_failed_fallback"],
				})),
			};
		}
	}

	private async recallHybrid(
		input: MemoryRecallInput,
		query: MemoryQuery,
		tags: string[],
		queryEmbedding: number[],
	): Promise<MemoryRecallResult> {
		const queryText = query.text;
		const vectorResults = this.vectorIndex
			? await this.vectorIndex.search({
				playerName: input.playerName,
				queryEmbedding,
				limit: 100,
				preferredTypes: query.preferredTypes,
				avoidTypes: query.avoidTypes,
			})
			: [];

		const semanticScoreByMemoryId = new Map(
			vectorResults.map((result) => [result.memoryId, result.semanticScore])
		);

		const vectorMemoryIds = vectorResults.map((result) => result.memoryId);

		const candidates = vectorMemoryIds.length > 0
			? this.longTermMemoryStore.getByIds(input.playerName, vectorMemoryIds)
			: this.longTermMemoryStore.getRecallCandidates(input.playerName, 500);

		const scored = candidates
			.map((memory) => {
				const semanticScore = semanticScoreByMemoryId.get(memory.id) ?? 0;

				const tagScore = this.calculateTagScore(memory, tags);
				const typeScore = this.calculateTypeScore(memory, query);
				const avoidPenalty = query.avoidTypes.includes(memory.type) ? 0.25 : 0;
				const reinforcementBoost = Math.min(memory.reinforcementCount * 0.03, 0.15);

				const score =
					semanticScore * 0.55 +
					tagScore * 0.15 +
					typeScore * 0.15 +
					memory.importance * 0.1 +
					memory.confidence * 0.05 +
					reinforcementBoost -
					avoidPenalty;

				return {
					memory,
					score,
					semanticScore,
					tagScore,
					typeScore,
					reasons: this.explainRecall(memory, tags, semanticScore, tagScore, typeScore, query),
				};
			})
			.filter((result) =>
				result.score > 0 &&
				(
					result.semanticScore >= 0.55 ||
					result.tagScore > 0 ||
					result.typeScore > 0
				)
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
				typeScore: this.roundScore(result.typeScore),
				reasons: result.reasons,
			})),
			queryText,
			tags,
			candidateCount: candidates.length,
			vectorResultCount: vectorResults.length,
			query,
		};
	}

	private recallByTags(
		input: MemoryRecallInput,
		query: MemoryQuery,
		tags: string[],
	): MemoryRecallResult {
		const queryText = query.text;
		const memories = this.longTermMemoryStore.findRelevant(
			input.playerName,
			tags,
			input.limit ?? 5,
		);

		return {
			memories,
			debug: memories.map((memory) => {
				const tagScore = this.calculateTagScore(memory, tags);
				const typeScore = this.calculateTypeScore(memory, query);

				return {
					memoryId: memory.id,
					summary: memory.summary,
					score: tagScore,
					semanticScore: 0,
					tagScore,
					typeScore,
					reasons: this.explainRecall(memory, tags, 0, tagScore, typeScore, query),
				};
			}),
			queryText,
			tags,
			candidateCount: memories.length,
			vectorResultCount: 0,
			query,
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

	private calculateTypeScore(memory: MemoryRecord, query: MemoryQuery): number {
		if (query.preferredTypes.length === 0) {
			return 0;
		}

		return query.preferredTypes.includes(memory.type) ? 1 : 0;
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
		typeScore: number,
		query: MemoryQuery,
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

		if (typeScore > 0) {
			reasons.push("preferred_type");
		}

		if (query.avoidTypes.includes(memory.type)) {
			reasons.push("avoid_type_penalty");
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
