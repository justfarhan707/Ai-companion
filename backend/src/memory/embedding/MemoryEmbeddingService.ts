import type { MemoryRecord } from "../MemoryRecord.js";
import type { LongTermMemoryStore } from "../LongTermMemoryStore.js";
import type { EmbeddingProvider } from "./EmbeddingProvider.js";

export class MemoryEmbeddingService {
    constructor(
        private readonly memoryStore: LongTermMemoryStore,
        private readonly embeddingProvider: EmbeddingProvider,
    ) {
    }

    async embedAndStore(memory: MemoryRecord): Promise<void> {
        const text = this.buildMemoryText(memory);
        const embedding = await this.embeddingProvider.embedText(text, "RETRIEVAL_DOCUMENT");

        this.memoryStore.updateEmbedding(memory.id, embedding);
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
