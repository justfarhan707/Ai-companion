import type { BehaviorObservation } from "./BehaviorObservation.js";
import type { BehaviorReflection } from "./BehaviorReflection.js";

type GeminiResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
};

export class BehaviorReflectionService {
	private readonly apiKey: string;
	private readonly model: string;

	constructor() {
		this.apiKey = process.env.GEMINI_MEMORY_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
		this.model = process.env.GEMINI_MEMORY_MODEL ?? "gemini-flash-lite-latest";

		if (!this.apiKey) {
			throw new Error("GEMINI_MEMORY_API_KEY or GEMINI_API_KEY is required for behavior reflection");
		}
	}

	async reflect(input: {
		playerName: string;
		observations: BehaviorObservation[];
	}): Promise<BehaviorReflection> {
		if (input.observations.length < 8) {
			return { learned: false };
		}

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							role: "user",
							parts: [{ text: this.buildPrompt(input.playerName, input.observations) }],
						},
					],
					generationConfig: {
						temperature: 0.2,
						maxOutputTokens: 500,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Gemini behavior reflection failed: ${response.status} ${await response.text()}`);
		}

		const data = await response.json() as GeminiResponse;
		const text = data.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? "")
			.join("")
			.trim();

		return this.parseReflection(text);
	}

	private buildPrompt(playerName: string, observations: BehaviorObservation[]): string {
		return [
			"You are Yuri's behavioral reflection system.",
			"Your job is to infer stable player playstyle patterns from repeated Minecraft behavior observations.",
			"Return only valid JSON. No markdown. No explanation.",
			"",
			"Rules:",
			"- Do not infer a playstyle from one isolated observation.",
			"- Only learn a pattern if there is repeated or strong evidence.",
			"- Be cautious. Prefer learned=false when evidence is weak.",
			"- Do not invent facts not supported by observations.",
			"- Write the summary as a cautious tendency, not an absolute trait.",
			"- Good: Farhan tends to prefer cave exploration over village activity.",
			"- Bad: Farhan always loves caves and hates villages.",
			"",
			"Return one of these shapes:",
			`{"learned":false}`,
			`{"learned":true,"summary":"string","tags":["playstyle","tag"],"confidence":0.7,"importance":0.7,"evidenceIds":["id"]}`,
			"",
			`Player: ${playerName}`,
			"Observations:",
			...observations.map((observation, index) =>
				[
					`Observation ${index + 1}:`,
					`id: ${observation.id}`,
					`situation: ${observation.situation}`,
					`playerAction: ${observation.playerAction}`,
					`importance: ${observation.importance}`,
					`context: ${JSON.stringify(observation.context)}`,
				].join("\n")
			),
		].join("\n");
	}

	private parseReflection(text: string | undefined): BehaviorReflection {
		if (!text) {
			return { learned: false };
		}

		try {
			const cleaned = text
				.replace(/^```json/i, "")
				.replace(/^```/i, "")
				.replace(/```$/i, "")
				.trim();

			const parsed = JSON.parse(cleaned) as Partial<BehaviorReflection>;

			if (!parsed.learned || typeof parsed.summary !== "string") {
				return { learned: false };
			}

			return {
				learned: true,
				summary: parsed.summary.trim(),
				tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ["playstyle"],
				confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.65))),
				importance: Math.min(1, Math.max(0, Number(parsed.importance ?? 0.65))),
				evidenceIds: Array.isArray(parsed.evidenceIds) ? parsed.evidenceIds.map(String) : [],
			};
		} catch {
			return { learned: false };
		}
	}
}
