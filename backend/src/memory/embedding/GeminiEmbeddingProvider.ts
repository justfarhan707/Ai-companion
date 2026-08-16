import type { EmbeddingProvider } from "./EmbeddingProvider.js";


type GeminiEmbeddingResponse = {
    embedding?: {
        values?: number[];
    };
};

export class GeminiEmbeddingProvider implements EmbeddingProvider {
    private readonly apiKey: string;
    private readonly model: string;

    constructor() {
        this.apiKey = process.env.GEMINI_EMBEDDING_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
        this.model = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

        if (!this.apiKey) {
            throw new Error("GEMINI_EMBEDDING_API_KEY or GEMINI_API_KEY is required for embeddings");
        }
    }

    async embedText(
        text: string,
        taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
    ): Promise<number[]> {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `models/${this.model}`,
                    content: {
                        parts: [{ text }],
                    },
                    embedContentConfig: {
                        taskType,
                    },
                }),
            },
        );

        if (!response.ok) {
            throw new Error(`Gemini embedding failed: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as GeminiEmbeddingResponse;
        const values = data.embedding?.values;

        if (!Array.isArray(values) || values.length === 0) {
            throw new Error("Gemini embedding response did not include values");
        }

        return values;
    }
}