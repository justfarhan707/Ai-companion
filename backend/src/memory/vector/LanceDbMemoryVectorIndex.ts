import * as lancedb from "@lancedb/lancedb";
import type {
	MemoryVectorIndex,
	MemoryVectorSearchInput,
	MemoryVectorSearchResult,
} from "./MemoryVectorIndex.js";
import type { MemoryType } from "../MemoryRecord.js";

type LanceMemoryRow = {
	memoryId: string;
	playerName: string;
	vector: number[];
	type: MemoryType;
	tags: string[];
	importance: number;
	updatedAt: string;
};

export class LanceDbMemoryVectorIndex implements MemoryVectorIndex {
	private tablePromise?: Promise<any>;

	constructor(
		private readonly uri = "data/yuri-lancedb",
		private readonly tableName = "memory_vectors",
	) {
	}

	async upsert(input: {
		memoryId: string;
		playerName: string;
		embedding: number[];
		type: MemoryType;
		tags: string[];
		importance: number;
		updatedAt: string;
	}): Promise<void> {
		const table = await this.getOrCreateTable({
			memoryId: input.memoryId,
			playerName: input.playerName,
			vector: input.embedding,
			type: input.type,
			tags: input.tags,
			importance: input.importance,
			updatedAt: input.updatedAt,
		});

		await table.delete(`memoryId = '${this.escapeSqlString(input.memoryId)}'`);

		await table.add([
			{
				memoryId: input.memoryId,
				playerName: input.playerName,
				vector: input.embedding,
				type: input.type,
				tags: input.tags,
				importance: input.importance,
				updatedAt: input.updatedAt,
			},
		]);
	}

	async search(input: MemoryVectorSearchInput): Promise<MemoryVectorSearchResult[]> {
		const table = await this.openExistingTable();

		if (!table) {
			return [];
		}

		const rows = await table
			.query()
			.nearestTo(input.queryEmbedding)
			.column("vector")
			.distanceType("cosine")
			.where(`playerName = '${this.escapeSqlString(input.playerName)}'`)
			.limit(input.limit)
			.toArray() as Array<LanceMemoryRow & { _distance?: number }>;

		return rows.map((row) => ({
			memoryId: row.memoryId,
			semanticScore: this.distanceToSimilarity(row._distance),
		}));
	}

	private async getOrCreateTable(firstRow: LanceMemoryRow): Promise<any> {
		if (!this.tablePromise) {
			this.tablePromise = this.openOrCreateTable(firstRow);
		}

		return this.tablePromise;
	}

	private async openExistingTable(): Promise<any | undefined> {
		const db = await lancedb.connect(this.uri);

		try {
			return await db.openTable(this.tableName);
		} catch {
			return undefined;
		}
	}

	private async openOrCreateTable(firstRow: LanceMemoryRow): Promise<any> {
		const db = await lancedb.connect(this.uri);

		try {
			return await db.openTable(this.tableName);
		} catch {
			return await db.createTable(this.tableName, [firstRow]);
		}
	}

	private distanceToSimilarity(distance: number | undefined): number {
		if (distance === undefined) {
			return 0;
		}

		return Math.max(0, 1 - distance);
	}

	private escapeSqlString(value: string): string {
		return value.replaceAll("'", "''");
	}
}
