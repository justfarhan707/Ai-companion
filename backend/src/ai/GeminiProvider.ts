import type { LlmProvider } from "./LlmProvider.js";
import type { ChatResponse } from "../types/chat.js";
import type { PlannedResponse } from "../planning/PlannedResponse.js";
import type { PlanningContext } from "../planning/PlanningContext.js";
import type { LlmChatInput } from "./LlmChatInput.js";
import type { LlmReactionInput } from "./LlmReactionInput.js";
import { PromptBuilder } from "./PromptBuilder.js";

export class GeminiProvider implements LlmProvider {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly promptBuilder = new PromptBuilder();

	constructor() {
		this.apiKey = process.env.GEMINI_API_KEY ?? "";
		this.model = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

		if (!this.apiKey) {
			throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
		}
	}

	async chat(input: LlmChatInput): Promise<ChatResponse> {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					systemInstruction: {
						parts: [{ text: this.promptBuilder.buildSystemInstruction() }],
					},
					contents: [
						{
							role: "user",
							parts: [{ text: this.promptBuilder.buildUserPrompt(input) }],
						},
					],
					generationConfig: {
						temperature: 0.75,
						maxOutputTokens: 120,
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Gemini failed: ${response.status} ${await response.text()}`);
		}

		const data = await response.json() as GeminiResponse;
		const reply = data.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? "")
			.join("")
			.trim();

		return {
			reply: this.cleanReply(reply) || "I'm here, but I don't know what to say yet.",
			emotion: "friendly",
			actions: [],
		};
	}



	private cleanReply(reply: string | undefined): string {
		if (!reply) {
			return "";
		}

		return reply
			.replace(/^#+\s*/g, "")
			.replace(/^\*?\*?(Drafting Replies|Player'?s Input|Yuri)\*?\*?:?\s*/i, "")
			.trim();
	}


    async react(input: LlmReactionInput): Promise<ChatResponse> {
    	const response = await fetch(
    		`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
    		{
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({
    				systemInstruction: {
    					parts: [{ text: this.promptBuilder.buildSystemInstruction() }],
    				},
    				contents: [
    					{
    						role: "user",
    						parts: [{ text: this.promptBuilder.buildReactionPrompt(input) }],
    					},
    				],
    				generationConfig: {
    					temperature: 0.9,
    					maxOutputTokens: 80,
    				},
    			}),
    		},
    	);

    if (!response.ok) {
    		throw new Error(`Gemini reaction failed: ${response.status} ${await response.text()}`);
    	}

    	const data = await response.json() as GeminiResponse;
    	const reply = data.candidates?.[0]?.content?.parts
    		?.map((part) => part.text ?? "")
    		.join("")
    		.trim();

    	return {
    		reply: this.cleanReply(reply) || "Something feels different here.",
    		emotion: "friendly",
    		actions: [],
    	};
    }

	async plan(input: PlanningContext): Promise<PlannedResponse> {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							role: "user",
							parts: [{ text: this.promptBuilder.buildPlanningPrompt(input) }],
						},
					],
					generationConfig: {
						temperature: 0.45,
						maxOutputTokens: 220,
						responseMimeType: "application/json",
					},
				}),
			},
		);

		if (!response.ok) {
			throw new Error(`Gemini planner failed: ${response.status} ${await response.text()}`);
		}

		const data = await response.json() as GeminiResponse;
		const text = data.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? "")
			.join("")
			.trim();
		const parsed = this.parsePlannedResponse(text);

		return {
			reply: parsed.reply,
			emotion: parsed.emotion,
			actions: parsed.actions,
		};
	}

	private parsePlannedResponse(text: string | undefined): PlannedResponse {
		if (!text) {
			return {
				reply: "I'm thinking.",
				emotion: "friendly",
				actions: [],
			};
		}

		try {
			const cleaned = text
				.replace(/^```json/i, "")
				.replace(/^```/i, "")
				.replace(/```$/i, "")
				.trim();
			const parsed = JSON.parse(cleaned) as Partial<PlannedResponse>;

			return {
				reply: String(parsed.reply ?? "I'm thinking."),
				emotion: parsed.emotion ?? "friendly",
				actions: Array.isArray(parsed.actions) ? parsed.actions : [],
			};
		} catch {
			return {
				reply: this.cleanReply(text) || "I'm thinking.",
				emotion: "friendly",
				actions: [],
			};
		}
	}
}

type GeminiResponse = {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>;
		};
	}>;
};
