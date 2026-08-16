import type { MemoryExtractorProvider, MemoryExtractionInput } from "./MemoryExtractorProvider.js";
import type { ExtractedMemoryCandidate } from "./ExtractedMemoryCandidate.js";

// will return something like
// {
//     shouldRemember: true,
//     type: "preference",
//     summary: "Farhan's favorite biome is cherry grove.",
//     tags: ["preference", "biome"],
//     importance: 0.8,
//     confidence: 0.95
// }

type GeminiResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
};


export class GeminiMemoryExtractor implements MemoryExtractorProvider {
	private readonly apiKey: string;
	private readonly model: string;

    constructor() {
		this.apiKey = process.env.GEMINI_MEMORY_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
		this.model = process.env.GEMINI_MEMORY_MODEL ?? "gemini-flash-lite-latest";

		if (!this.apiKey) {
			throw new Error("GEMINI_MEMORY_API_KEY or GEMINI_API_KEY is required for memory extraction");
		}
	}

	async extract(input: MemoryExtractionInput): Promise<ExtractedMemoryCandidate[]> {
		const prompt = this.buildPrompt(input);

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							role: "user",
							parts: [{ text: prompt }],
						},
					],
					generationConfig: {
						temperature: 0.1,
						maxOutputTokens: 400,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Gemini memory extraction failed: ${response.status} ${await response.text()}`);
		}

   		const data = await response.json() as GeminiResponse;
   		const text = data.candidates?.[0]?.content?.parts
   			?.map((part) => part.text ?? "")
   			.join("")
   			.trim();

   		return this.parseCandidates(text);
   	}

   	private buildPrompt(input: MemoryExtractionInput): string {
   		const recentConversation = input.recentMessages
   			.map((message) => `${message.role}: ${message.content}`)
   			.join("\n") || "none";

   		return [
   			"You are Yuri's long-term memory extractor.",
   			"Return only valid JSON. No markdown. No explanation.",
   			"",
   			"Extract durable memories about the player only if they are useful in future conversations.",
   			"Do not store temporary commands, greetings, small talk, or one-time requests.",
   			"Do not invent facts.",
   			"The latest player message is the primary evidence.",
   			"Yuri's reply is context only, not proof that a player fact is true.",
   			"Do not create a memory from Yuri's reply unless the latest player message also states the fact.",
   			"If the latest player message is asking what Yuri remembers, return an empty memories array.",
   			"",
   			"Allowed memory types:",
   			"preference, personal_fact, instruction, place",
   			"",
   			"Return JSON shape:",
   			`{"memories":[{"shouldRemember":true,"type":"preference","summary":"string","tags":["tag"],"importance":0.7,"confidence":0.9}]}`,
   			"",
   			"Recent conversation:",
   			recentConversation,
   			"",
   			`Latest player message: ${input.request.message}`,
   			`Yuri reply: ${input.yuriReply}`,
   		].join("\n");
   	}

   	private parseCandidates(text: string | undefined): ExtractedMemoryCandidate[] {
   		if (!text) {
   			return [];
   		}

   		try {
   			const cleaned = text
   				.replace(/^```json/i, "")
   				.replace(/^```/i, "")
   				.replace(/```$/i, "")
   				.trim();

   			const parsed = JSON.parse(cleaned) as { memories?: unknown[] };

   			if (!Array.isArray(parsed.memories)) {
   				return [];
   			}

   			return parsed.memories
   				.map((memory) => this.normalizeCandidate(memory))
   				.filter((memory): memory is ExtractedMemoryCandidate => memory !== undefined);
   		} catch {
   			return [];
   		}
   	}

   	private normalizeCandidate(value: unknown): ExtractedMemoryCandidate | undefined {
   		if (typeof value !== "object" || value === null) {
   			return undefined;
   		}

   		const candidate = value as Partial<ExtractedMemoryCandidate>;

   		if (!candidate.shouldRemember || typeof candidate.summary !== "string") {
   			return undefined;
   		}

       const type = String(candidate.type);

       if (!["preference", "personal_fact", "instruction", "place"].includes(type)) {
        return undefined;
       }

       return {
        shouldRemember: true,
        type: type as ExtractedMemoryCandidate["type"],
        summary: candidate.summary.trim(),
        tags: Array.isArray(candidate.tags) ? candidate.tags.map(String) : [],
        importance: Math.min(1, Math.max(0, Number(candidate.importance ?? 0.5))),
        confidence: Math.min(1, Math.max(0, Number(candidate.confidence ?? 0.7))),
       };
   	}
   }
