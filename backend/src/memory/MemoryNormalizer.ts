import type { MemoryRecord } from "./MemoryRecord.js";

const TAG_ALIASES: Record<string, string> = {
	favorite: "preference",
	"cherry-grove": "cherry_grove",
	player_identity: "player",
	minecraft: "minecraft",
}

export class MemoryNormalizer {
	normalize(memory: MemoryRecord): MemoryRecord {
		return {
			...memory,
			summary: this.normalizeSummary(memory.summary),
			tags: this.normalizeTags(memory.tags),
		};
	}

	normalizeTags(tags: string[]): string[] {
		const normalized = tags
			.map((tag) => tag.trim().toLowerCase())
			.map((tag) => tag.replaceAll("-", "_"))
			.map((tag) => TAG_ALIASES[tag] ?? tag)
			.filter((tag) => tag.length > 0);

		return [...new Set(normalized)];
	}

	normalizeSummary(summary: string): string {
		return summary
			.trim()
			.replace(/\s+/g, " ")
			.replace(/\bthe cherry grove\b/i, "cherry grove");
	}
}