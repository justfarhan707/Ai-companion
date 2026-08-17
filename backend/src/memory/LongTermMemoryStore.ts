import { database } from "../db/database.js";
import type { MemoryLocation, MemoryRecord } from "./MemoryRecord.js";

type MemoryRow = {
	id: string;
	player_name: string;
	type: MemoryRecord["type"];
	summary: string;
	tags_json: string;
	world: string;
	x: number;
	y: number;
	z: number;
	importance: number;
	confidence: number;
	reinforcement_count: number;
	recall_count: number;
	evidence_json: string;
	embedding_json: string | null;
	created_at: string;
	last_updated_at: string;
	last_recalled_at: string | null;
};

export class LongTermMemoryStore {
	private readonly insertMemory = database.prepare(`
		INSERT OR IGNORE INTO memories (
			id,
			player_name,
			type,
			summary,
			tags_json,
			world,
			x,
			y,
			z,
			importance,
			confidence,
			reinforcement_count,
			recall_count,
			evidence_json,
			embedding_json,
			created_at,
			last_updated_at,
			last_recalled_at
		) VALUES (
			@id,
			@playerName,
			@type,
			@summary,
			@tagsJson,
			@world,
			@x,
			@y,
			@z,
			@importance,
			@confidence,
			@reinforcementCount,
			@recallCount,
			@evidenceJson,
			@embeddingJson,
			@createdAt,
			@lastUpdatedAt,
			@lastRecalledAt
		)
	`);

	private readonly updateMemory = database.prepare(`
		UPDATE memories
		SET
			summary = @summary,
			tags_json = @tagsJson,
			importance = @importance,
			confidence = @confidence,
			reinforcement_count = @reinforcementCount,
			recall_count = @recallCount,
			evidence_json = @evidenceJson,
			embedding_json = @embeddingJson,
			last_updated_at = @lastUpdatedAt,
			last_recalled_at = @lastRecalledAt
		WHERE id = @id
	`);

	private readonly selectMemoriesForPlayer = database.prepare(`
		SELECT
			id,
			player_name,
			type,
			summary,
			tags_json,
			world,
			x,
			y,
			z,
			importance,
			confidence,
			reinforcement_count,
			recall_count,
			evidence_json,
			embedding_json,
			created_at,
			last_updated_at,
			last_recalled_at
		FROM memories
		WHERE player_name = ?
		ORDER BY importance DESC, reinforcement_count DESC, created_at DESC
	`);

	private readonly selectRecallCandidatesForPlayer = database.prepare(`
		SELECT
			id,
			player_name,
			type,
			summary,
			tags_json,
			world,
			x,
			y,
			z,
			importance,
			confidence,
			reinforcement_count,
			recall_count,
			evidence_json,
			embedding_json,
			created_at,
			last_updated_at,
			last_recalled_at
		FROM memories
		WHERE player_name = ?
		  AND embedding_json IS NOT NULL
		ORDER BY
			importance DESC,
			reinforcement_count DESC,
			last_updated_at DESC,
			created_at DESC
		LIMIT ?
	`);

	addOrReinforce(memory: MemoryRecord): MemoryRecord {
		const existing = this.findSimilar(memory);

		if (!existing) {
			this.insert(memory);
			return memory;
		}

		const reinforced = this.reinforce(existing, memory);
		this.update(reinforced);
		return reinforced;
	}

	add(memory: MemoryRecord): void {
		this.insert(memory);
	}

	getForPlayer(playerName: string): MemoryRecord[] {
		const rows = this.selectMemoriesForPlayer.all(playerName) as MemoryRow[];
		return rows.map((row) => this.toMemoryRecord(row));
	}

	getRecallCandidates(playerName: string, limit = 500): MemoryRecord[] {
		const rows = this.selectRecallCandidatesForPlayer.all(playerName, limit) as MemoryRow[];
		return rows.map((row) => this.toMemoryRecord(row));
	}

	findRelevant(playerName: string, tags: string[], limit = 3): MemoryRecord[] {
		if (tags.length === 0) {
			return [];
		}

		const relevant = this.getForPlayer(playerName)
			.map((memory) => ({
				memory,
				score: this.scoreMemory(memory, tags),
			}))
			.filter((result) => result.score > 0) //remove useless less scored
			.sort((a, b) => b.score - a.score)//sort them
			.slice(0, limit)//take only the top one
			.map((result) => result.memory);

		for (const memory of relevant) {
			this.markRecalled(memory);
		}

		return relevant;
	}

	markMemoriesRecalled(memories: MemoryRecord[]): void {
		for (const memory of memories) {
			this.markRecalled(memory);
		}
	}

	updateEmbedding(memoryId: string, embedding: number[]): void {
		this.updateMemoryEmbedding.run({
			id: memoryId,
			embeddingJson: JSON.stringify(embedding),
			lastUpdatedAt: new Date().toISOString(),
		});
	}

	private insert(memory: MemoryRecord): void {
		this.insertMemory.run(this.toSqlParams(memory));
	}

	private update(memory: MemoryRecord): void {
		this.updateMemory.run(this.toSqlParams(memory));
	}

	//dont create a new memory strengthen the old memory
	private reinforce(existing: MemoryRecord, incoming: MemoryRecord): MemoryRecord {
		return {
			...existing,
			importance: Math.min(1, Math.max(existing.importance, incoming.importance) + 0.03),
			confidence: Math.min(1, existing.confidence + 0.05),
			reinforcementCount: existing.reinforcementCount + 1,
			evidence: {
				...existing.evidence,
				lastReinforcement: incoming.evidence,
				lastReinforcedAt: incoming.createdAt,
			},
			lastUpdatedAt: incoming.createdAt,
		};
	}

	private findSimilar(memory: MemoryRecord): MemoryRecord | undefined {
		const incomingSummaryKey = this.normalizedSummaryKey(memory.summary);

		return this.getForPlayer(memory.playerName).find((candidate) => {
			if (candidate.type !== memory.type) {
				return false;
			}

			if (candidate.location.world !== memory.location.world) {
				return false;
			}

			const candidateSummaryKey = this.normalizedSummaryKey(candidate.summary);

			if (
				incomingSummaryKey.length > 0 &&
				candidateSummaryKey === incomingSummaryKey
			) {
				return true;
			}

			return (
				this.sharedTagCount(candidate.tags, memory.tags) >= 2 &&
				this.distanceSq(candidate.location, memory.location) <= 40 * 40
			);
		});
	}

	private normalizedSummaryKey(summary: string): string {
		return summary
			.toLowerCase()
			.replace(/player's/g, "player")
			.replace(/[^\w\s]/g, "")
			.replace(/\bthe\b/g, "")
			.replace(/\bplayers\b/g, "player")
			.replace(/\s+/g, " ")
			.trim();
	}

	private markRecalled(memory: MemoryRecord): void {
		this.update({
			...memory,
			recallCount: memory.recallCount + 1,
			lastRecalledAt: new Date().toISOString(),
		});
	}

	//importance of memories more scored memories will be given to gemini
	private scoreMemory(memory: MemoryRecord, tags: string[]): number {
		let matchingTagCount = 0;

		for (const tag of tags) {
			if (memory.tags.includes(tag)) {
				matchingTagCount += 1;
			}
		}

		if (matchingTagCount === 0) {
			return 0;
		}

		let score = matchingTagCount;

		score += memory.importance;
		score += memory.confidence;
		score += Math.min(memory.reinforcementCount * 0.1, 0.5);//smimiliar tags gets a bit high boost for eg danger tag
		score += Math.min(memory.recallCount * 0.03, 0.3);//repeated memories gets small bosst

		return score;
	}

	private sharedTagCount(a: string[], b: string[]): number {
		const bSet = new Set(b);
		return a.filter((tag) => bSet.has(tag)).length;
	}

	private distanceSq(a: MemoryLocation, b: MemoryLocation): number {
		const dx = a.x - b.x;
		const dy = a.y - b.y;
		const dz = a.z - b.z;
		return dx * dx + dy * dy + dz * dz;
	}

	private toSqlParams(memory: MemoryRecord): Record<string, unknown> {
		return {
			id: memory.id,
			playerName: memory.playerName,
			type: memory.type,
			summary: memory.summary,
			tagsJson: JSON.stringify(memory.tags),
			world: memory.location.world,
			x: memory.location.x,
			y: memory.location.y,
			z: memory.location.z,
			importance: memory.importance,
			confidence: memory.confidence,
			reinforcementCount: memory.reinforcementCount,
			recallCount: memory.recallCount,
			evidenceJson: JSON.stringify(memory.evidence),
			createdAt: memory.createdAt,
			embeddingJson: memory.embedding ? JSON.stringify(memory.embedding) : null,
			lastUpdatedAt: memory.lastUpdatedAt,
			lastRecalledAt: memory.lastRecalledAt ?? null,
		};
	}

	private toMemoryRecord(row: MemoryRow): MemoryRecord {
		return {
			id: row.id,
			playerName: row.player_name,
			type: row.type,
			summary: row.summary,
			tags: JSON.parse(row.tags_json) as string[],
			location: {
				world: row.world,
				x: row.x,
				y: row.y,
				z: row.z,
			},
			importance: row.importance,
			confidence: row.confidence,
			reinforcementCount: row.reinforcement_count,
			recallCount: row.recall_count,
			evidence: JSON.parse(row.evidence_json) as Record<string, unknown>,
			createdAt: row.created_at,
			embedding: row.embedding_json
				? JSON.parse(row.embedding_json) as number[]
				: undefined,
			lastUpdatedAt: row.last_updated_at || row.created_at,
			lastRecalledAt: row.last_recalled_at ?? undefined,
		};
	}

	private readonly updateMemoryEmbedding = database.prepare(`
	UPDATE memories
	SET
		embedding_json = @embeddingJson,
		last_updated_at = @lastUpdatedAt
	WHERE id = @id
`);
}
