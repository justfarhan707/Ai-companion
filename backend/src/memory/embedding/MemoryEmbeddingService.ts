import type { MemoryRecord } from "../MemoryRecord.js";
import type { LongTermMemoryStore } from "../LongTermMemoryStore.js";
import type { EmbeddingProvider } from "./EmbeddingProvider.js";
import type { MemoryVectorIndex } from "../vector/MemoryVectorIndex.js";

export class MemoryEmbeddingService {
    constructor(
        private readonly memoryStore: LongTermMemoryStore,
        private readonly embeddingProvider: EmbeddingProvider,
        private readonly vectorIndex?: MemoryVectorIndex,
    ) {
    }

	async embedAndStore(memory: MemoryRecord): Promise<void> {
    	const text = this.buildMemoryText(memory);
    	const embedding = await this.embeddingProvider.embedText(text, "RETRIEVAL_DOCUMENT");

    	this.memoryStore.updateEmbedding(memory.id, embedding);

    	if (this.vectorIndex) {
    		await this.vectorIndex.upsert({
    			memoryId: memory.id,
    			playerName: memory.playerName,
    			embedding,
    			type: memory.type,
    			tags: memory.tags,
    			importance: memory.importance,
    			updatedAt: memory.lastUpdatedAt,
    		});
    	}
    }

	async backfillMissingEmbeddings(input: {
		playerName: string;
		limit?: number;
	}): Promise<{
		processed: number;
		succeeded: number;
		failed: number;
		errors: string[];
	}> {
		const memories = this.memoryStore.getMemoriesMissingEmbeddings(
			input.playerName,
			input.limit ?? 50,
		);

		let succeeded = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const memory of memories) {
			try {
				await this.embedAndStore(memory);
				succeeded += 1;
			} catch (error) {
				failed += 1;
				const message = error instanceof Error ? error.message : "Unknown embedding error";
				errors.push(`Memory ${memory.id}: ${message}`);
			}
		}

		return {
			processed: memories.length,
			succeeded,
			failed,
			errors,
		};
	}

	async reindexExistingEmbeddings(input: {
		playerName: string;
		limit?: number;
	}): Promise<{
		processed: number;
		succeeded: number;
		failed: number;
		errors: string[];
	}> {
		const memories = this.memoryStore.getRecallCandidates(
			input.playerName,
			input.limit ?? 500,
		);

		let succeeded = 0;
		let failed = 0;
		const errors: string[] = [];

		if (!this.vectorIndex) {
			return {
				processed: memories.length,
				succeeded: 0,
				failed: memories.length,
				errors: ["No memory vector index is configured."],
			};
		}

		for (const memory of memories) {
			if (!memory.embedding) {
				continue;
			}

			try {
				await this.vectorIndex.upsert({
					memoryId: memory.id,
					playerName: memory.playerName,
					embedding: memory.embedding,
					type: memory.type,
					tags: memory.tags,
					importance: memory.importance,
					updatedAt: memory.lastUpdatedAt,
				});
				succeeded += 1;
			} catch (error) {
				failed += 1;
				const message = error instanceof Error ? error.message : "Unknown vector index error";
				errors.push(`Memory ${memory.id}: ${message}`);
			}
		}

		return {
			processed: memories.length,
			succeeded,
			failed,
			errors,
		};
	}

	buildMemoryText(memory: MemoryRecord): string {
        return [
            `Type: ${memory.type}`,
            `Summary: ${memory.summary}`,
            `Tags: ${memory.tags.join(", ")}`,
            `Importance: ${memory.importance}`,
            `Confidence: ${memory.confidence}`,
            `Evidence: ${JSON.stringify(memory.evidence)}`,
        ].join("\n");
    }
}
