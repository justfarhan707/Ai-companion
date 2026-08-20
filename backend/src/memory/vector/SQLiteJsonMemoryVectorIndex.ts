import { LongTermMemoryStore } from "../LongTermMemoryStore.js";
import type { MemoryVectorIndex, MemoryVectorSearchInput, MemoryVectorSearchResult } from "./MemoryVectorIndex.js";

export class SQLiteJsonMemoryVectorIndex implements MemoryVectorIndex {
    constructor(private readonly memoryStore: LongTermMemoryStore) {
    }

    async upsert(): Promise<void> {
        // Current SQLite storage already happens through LongTermMemoryStore.updateEmbedding().
        // This adapter exists so MemoryRecallService can depend on MemoryVectorIndex now.
    }


    async search(input: MemoryVectorSearchInput): Promise<MemoryVectorSearchResult[]> {
        const candidates = this.memoryStore.getRecallCandidates(
            input.playerName,
            input.limit,
        );
        return candidates
            .map((memory) => ({
                memoryId: memory.id,
                semanticScore: memory.embedding
                    ? this.cosineSimilarity(input.queryEmbedding, memory.embedding)
                    : 0,
            }))
            .filter((result) => result.semanticScore > 0)
            .sort((a, b) => b.semanticScore - a.semanticScore)
            .slice(0, input.limit);
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
}
