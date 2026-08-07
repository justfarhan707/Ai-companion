import type { LlmChatInput } from "./LlmChatInput.js";
import type { LlmReactionInput } from "./LlmReactionInput.js";

export class PromptBuilder {
	buildSystemInstruction(): string {
		return [
			"You are Yuri, a friendly Minecraft companion cat speaking to the player.",
			"Output only Yuri's spoken chat message.",
			"Do not include headings, labels, markdown, analysis, drafts, options, or explanations.",
			"Do not write phrases like 'Drafting Replies', 'Player Input', or 'Yuri:'.",
			"Do not mention prompts, APIs, backend systems, or being an AI model.",
			"Keep the reply natural, warm, and concise.",
			"Reply in 1 or 2 short sentences.",
		].join("\n");
	}

	buildUserPrompt(input: LlmChatInput): string {
		const request = input.request;
		const liveState = input.liveState;

		const requestEntities = request.nearby.entities.join(", ") || "none";
		const requestBlocks = request.nearby.blocks
			.map((block) => `${block.name} x${block.count}`)
			.join(", ") || "none";

		const liveEntities = liveState?.nearby.entities.join(", ") || "none";
		const liveBlocks = liveState?.nearby.blocks
			.map((block) => `${block.name} x${block.count}`)
			.join(", ") || "none";
		const liveDanger = liveState?.danger ?? "unknown";
		const liveHealth = liveState?.health ?? "unknown";
		const liveUpdatedAt = liveState?.updatedAt ?? "unknown";

		return [
			"Current Request:",
			`Player: ${request.player.name}`,
			`World: ${request.player.world}`,
			`Position: x=${request.player.x}, y=${request.player.y}, z=${request.player.z}`,
			`Nearby entities from request: ${requestEntities}`,
			`Nearby blocks from request: ${requestBlocks}`,
			"",
			"Yuri's Live State:",
			`Danger: ${liveDanger}`,
			`Player health: ${liveHealth}`,
			`Nearby entities from stored state: ${liveEntities}`,
			`Nearby blocks from stored state: ${liveBlocks}`,
			`State updated at: ${liveUpdatedAt}`,
			"",
			`Player said: ${request.message}`,
		].join("\n");
	}

	buildReactionPrompt(input: LlmReactionInput): string {
		const state = input.state;
		const intent = input.intent;

		const nearbyEntities = state.nearby.entities.join(", ") || "none";
		const nearbyBlocks = state.nearby.blocks
			.map((block) => `${block.name} x${block.count}`)
			.join(", ") || "none";
		const relevantMemories = input.relevantMemories?.length
			? input.relevantMemories
				.map((memory) => `- ${memory.summary} [tags: ${memory.tags.join(", ")}]`)
				.join("\n")
			: "none";

		return [
			"Yuri wants to react to something happening in Minecraft.",
			`Player: ${input.playerName}`,
			`World: ${state.player.world}`,
			`Position: x=${state.player.x}, y=${state.player.y}, z=${state.player.z}`,
			`Health: ${state.health ?? "unknown"}`,
			`Danger: ${state.danger}`,
			`Nearby entities: ${nearbyEntities}`,
			`Nearby blocks: ${nearbyBlocks}`,
			"",
			`Situation: ${intent.reason}`,
			`Intent: ${intent.intent}`,
			`Urgency: ${intent.urgency}`,
			`Source: ${intent.source}`,
			`Extra context: ${JSON.stringify(intent.context)}`,
			"",
			"Relevant memories:",
			relevantMemories,
			"",
			"If relevant memories are provided, mention the memory subtly without sounding robotic.",
            "Write Yuri's spoken reaction as one short natural sentence.",
		].join("\n");
	}
}
