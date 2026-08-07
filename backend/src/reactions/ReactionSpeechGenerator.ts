//generates speech pn returned intents

import type { LlmProvider } from "../ai/LlmProvider.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { ReactionIntent } from "./ReactionIntent.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { YuriAction } from "../types/actions.js";

export class ReactionSpeechGenerator {
	constructor(private readonly llmProvider: LlmProvider) {
	}

	async generate(
		playerName: string,
		state: LiveStateTypes,
		intent: ReactionIntent,
		relevantMemories: MemoryRecord[] = [],
	): Promise<YuriAction> {
		if (!intent.useLlm && intent.text) {
			return {
				type: "say",
				text: intent.text,
			};
		}

		try {
			const response = await this.llmProvider.react({
				playerName,
				state,
				intent,
				relevantMemories,
			});

			return {
				type: "say",
				text: response.reply,
			};
		} catch {
			return {
				type: "say",
				text: this.fallbackLine(playerName, intent),
			};
		}
	}

	private fallbackLine(playerName: string, intent: ReactionIntent): string {
		switch (intent.reason) {
			case "PLAYER_LOW_HEALTH_WITH_HOSTILES":
				return `${playerName}, you're hurt and there are enemies nearby. Eat something or back away.`;

			case "HOSTILE_MOBS_NEARBY":
				return "We've got company nearby. Stay alert.";

			case "PASSIVE_MOBS_NEARBY":
				return "There are some animals nearby. This might be a useful place to gather supplies.";

			case "CREEPER_NEARBY":
				return intent.text ?? "Creeper!";

			default:
				return "Something feels important right now.";
		}
	}
}
