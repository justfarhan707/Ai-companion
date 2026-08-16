// MemoryCandidateGuard decides whether a candidate memory is safe to store.
// It blocks this kind of case:
// Player: what biome do I like?
// Yuri: You like cherry grove
// Because the player asked a recall question. The player did not provide a new fact.

import type { MemoryRecord } from "./MemoryRecord.js";

const RECALL_QUESTION_PATTERNS = [
	/\bwhat\b.*\bdo i\b.*\blike\b/i,
	/\bwhat\b.*\bmy\b.*\bfavorite\b/i,
	/\bdo you remember\b/i,
	/\bwhat is my name\b/i,
	/\bwho am i\b/i,
];

export class MemoryCandidateGuard {
	shouldStore(memory: MemoryRecord): boolean {
		const playerMessage = String(memory.evidence.playerMessage ?? "");

		if (this.isRecallQuestion(playerMessage)) {
			return false;
		}

		if (!this.isSupportedByPlayerMessage(memory, playerMessage)) {
			return false;
		}

		return true;
	}

	private isRecallQuestion(message: string): boolean {
		return RECALL_QUESTION_PATTERNS.some((pattern) => pattern.test(message));
	}

	private isSupportedByPlayerMessage(memory: MemoryRecord, playerMessage: string): boolean {
		const lowerMessage = playerMessage.toLowerCase();
		const lowerSummary = memory.summary.toLowerCase();

		if (memory.type === "preference") {
			return (
				lowerMessage.includes("favorite") ||
				lowerMessage.includes("i like") ||
				lowerMessage.includes("i love") ||
				lowerMessage.includes("i hate") ||
				lowerMessage.includes("i prefer")
			);
		}

		if (memory.type === "personal_fact") {
			return (
				lowerMessage.includes("my name is") ||
				lowerMessage.includes("call me") ||
				lowerMessage.includes("i am") ||
				lowerMessage.includes("i'm")
			);
		}

		if (memory.type === "instruction") {
			return (
				lowerMessage.includes("remember") ||
				lowerMessage.includes("always") ||
				lowerMessage.includes("don't") ||
				lowerMessage.includes("do not")
			);
		}
		if (memory.type === "place") {
			return (
				lowerMessage.includes("this is") ||
				lowerMessage.includes("my base") ||
				lowerMessage.includes("my home") ||
				lowerMessage.includes("remember this place")
			);
		}

		return lowerSummary.length > 0;
	}
}
