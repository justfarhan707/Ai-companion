//to update embedding quality will help in rag
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ChatRequest } from "../types/chat.js";

export type MemoryQueryInput = {
	playerName: string;
	message: string;
	request?: ChatRequest;
	liveState?: LiveStateTypes;
	recentMessages?: ConversationMessage[];
};

export class MemoryQueryBuilder {
	build(input: MemoryQueryInput): string {
		const parts: string[] = [];
		const message = input.message.trim();
		const lowerMessage = message.toLowerCase();

		if (message.length > 0) {
			parts.push(`Player message: ${message}`);
		}

		for (const intentLine of this.describeMessageIntent(lowerMessage)) {
			parts.push(intentLine);
		}

		for (const stateLine of this.describeCurrentState(input)) {
			parts.push(stateLine);
		}

		return parts.join("\n");
	}

	private describeMessageIntent(lowerMessage: string): string[] {
		const lines: string[] = [];

		if (this.isPreferenceQuestion(lowerMessage)) {
			lines.push("Player is asking about their preferences, likes, dislikes, favorites, or personal tastes.");
			lines.push("Need memories of type preference or personal_fact.");
		}

		if (this.isPlaceQuestion(lowerMessage)) {
			lines.push("Player is asking about a remembered place, home, base, or location.");
			lines.push("Need memories of type place or home.");
		}

		if (this.isIdentityQuestion(lowerMessage)) {
			lines.push("Player is asking about their identity or personal facts.");
			lines.push("Need memories of type personal_fact.");
		}

		if (this.isAdviceQuestion(lowerMessage)) {
			lines.push("Player is asking what to do next or wants advice.");
			lines.push("Need memories related to current situation, playstyle, instructions, survival, and preferences.");
		}

		if (this.isDangerExpression(lowerMessage)) {
			lines.push("Player may be worried, scared, hurt, or in danger.");
			lines.push("Need memories related to danger, near_death, hostile_mobs, caves, lava, survival, or past mistakes.");
		}

		if (this.isHelpOrActionRequest(lowerMessage)) {
			lines.push("Player may be asking Yuri to help or perform an action.");
			lines.push("Need memories about prior help, instructions, playstyle, and relevant action history.");
		}

		if (lines.length === 0) {
			lines.push("Player is having a general conversation with Yuri.");
			lines.push("Need memories that are directly relevant to the message and current situation.");
		}

		return lines;
	}

	private describeCurrentState(input: MemoryQueryInput): string[] {
		const lines: string[] = [];
		const state = input.liveState;
		const request = input.request;
		const health = state?.health;
		const hunger = request?.hunger ?? state?.hunger;
		const selectedItem = request?.selectedItem ?? state?.selectedItem;
		const entities = request?.nearby.entities ?? state?.nearby.entities ?? [];
		const blocks = request?.nearby.blocks ?? state?.nearby.blocks ?? [];
		const danger = state?.danger;

		if (danger && danger !== "none") {
			lines.push(`Current danger level: ${danger}.`);
		}

		if (health !== undefined) {
			lines.push(`Current health: ${health}.`);
		}

		if (hunger !== undefined) {
			lines.push(`Current hunger: ${hunger}.`);
		}

		if (selectedItem && selectedItem !== "empty") {
			lines.push(`Selected item: ${selectedItem}.`);
		}

		if (entities.length > 0) {
			lines.push(`Nearby entities: ${entities.join(", ")}.`);
		}

		if (blocks.length > 0) {
			lines.push(`Nearby blocks: ${blocks.map((block) => block.name).join(", ")}.`);
		}

		if ((health ?? 20) <= 6) {
			lines.push("Situation hint: player has low health.");
		}

		if ((hunger ?? 20) <= 8) {
			lines.push("Situation hint: player has low hunger.");
		}

		return lines;
	}

	private isPreferenceQuestion(message: string): boolean {
		return (
			message.includes("favorite") ||
			message.includes("what do i like") ||
			message.includes("what food do i like") ||
			message.includes("what biome do i like") ||
			message.includes("do i like") ||
			message.includes("what do i hate") ||
			message.includes("what do i prefer")
		);
	}

	private isPlaceQuestion(message: string): boolean {
		return (
			message.includes("where is my base") ||
			message.includes("where is home") ||
			message.includes("where's home") ||
			message.includes("remember this place") ||
			message.includes("my base") ||
			message.includes("my home")
		);
	}

	private isIdentityQuestion(message: string): boolean {
		return (
			message.includes("what is my name") ||
			message.includes("who am i") ||
			message.includes("what do you know about me")
		);
	}

	private isAdviceQuestion(message: string): boolean {
		return (
			message.includes("what should we do") ||
			message.includes("what do we do") ||
			message.includes("what now") ||
			message.includes("any ideas") ||
			message.includes("suggest") ||
			message.includes("advice")
		);
	}

	private isDangerExpression(message: string): boolean {
		return (
			message.includes("scared") ||
			message.includes("danger") ||
			message.includes("dying") ||
			message.includes("low health") ||
			message.includes("help me") ||
			message.includes("i'm hurt") ||
			message.includes("im hurt")
		);
	}

	private isHelpOrActionRequest(message: string): boolean {
		return (
			message.includes("help") ||
			message.includes("hunt") ||
			message.includes("attack") ||
			message.includes("follow") ||
			message.includes("come here") ||
			message.includes("go get") ||
			message.includes("bring")
		);
	}
}
