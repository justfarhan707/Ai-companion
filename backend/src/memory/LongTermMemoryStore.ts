import { database } from "../db/database.js";
import type { MemoryRecord } from "./MemoryRecord.js";

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
	evidence_json: string;
	created_at: string;
};

export class LongTermMemoryStore {
	private readonly memories = new Map<string, MemoryRecord[]>();
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
			evidence_json,
			created_at
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
			@evidenceJson,
			@createdAt
		)
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
			evidence_json,
			created_at
		FROM memories
		WHERE player_name = ?
		ORDER BY created_at DESC
	`);

	add(memory: MemoryRecord): void {
		const existing = this.memories.get(memory.playerName) ?? [];
		existing.push(memory);
		this.memories.set(memory.playerName, existing);

		this.insertMemory.run({
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
			evidenceJson: JSON.stringify(memory.evidence),
			createdAt: memory.createdAt,
		});
	}

	getForPlayer(playerName: string): MemoryRecord[] {
		const rows = this.selectMemoriesForPlayer.all(playerName) as MemoryRow[];
		return rows.map((row) => this.toMemoryRecord(row));
	}

  findRelevant(playerName: string, tags: string[], limit = 3): MemoryRecord[] {
  	const memories = this.getForPlayer(playerName);

  	return memories
  		.map((memory) => ({
  			memory,
  			score: this.scoreMemory(memory, tags),
  		}))
  		.filter((result) => result.score > 0)
  		.sort((a, b) => b.score - a.score)
  		.slice(0, limit)
  		.map((result) => result.memory);
  }

  private scoreMemory(memory: MemoryRecord, tags: string[]): number {
  	let score = 0;

  	for (const tag of tags) {
  		if (memory.tags.includes(tag)) {
  			score += 1;
  		}
  	}

  	score += memory.importance;

  	return score;
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
			evidence: JSON.parse(row.evidence_json) as Record<string, unknown>,
			createdAt: row.created_at,
		};
	}
}

