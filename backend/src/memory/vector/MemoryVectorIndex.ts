//the good ol interfacee once again

import type { MemoryType } from "../MemoryRecord.js";

export type MemoryVectorSearchInput = {
    playerName: string;
    queryEmbedding: number[];
    limit: number;
    preferredTypes?: MemoryType[];
    avoidTypes?: MemoryType[];
};

export type MemoryVectorSearchResult = {
    memoryId: string;
    semanticScore: number;
};

export interface MemoryVectorIndex {
    upsert(input: {
        memoryId: string;
        playerName: string;
        embedding: number[];
        type: MemoryType;
        tags: string[];
        importance: number;
        updatedAt: string;
    }): Promise<void>;

    search(input: MemoryVectorSearchInput): Promise<MemoryVectorSearchResult[]>;
}