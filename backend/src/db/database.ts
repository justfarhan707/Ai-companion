import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });

export const database = new Database(path.join(dataDirectory, "yuri.sqlite"));

database.pragma("journal_mode = WAL");

database.exec(`
	CREATE TABLE IF NOT EXISTS memories (
		id TEXT PRIMARY KEY,
		player_name TEXT NOT NULL,
		type TEXT NOT NULL,
		summary TEXT NOT NULL,
		tags_json TEXT NOT NULL,
		world TEXT NOT NULL,
		x INTEGER NOT NULL,
		y INTEGER NOT NULL,
		z INTEGER NOT NULL,
		importance REAL NOT NULL,
		evidence_json TEXT NOT NULL,
		embedding_json TEXT,
		created_at TEXT NOT NULL,
		confidence REAL NOT NULL DEFAULT 0.5,
		reinforcement_count INTEGER NOT NULL DEFAULT 1,
		recall_count INTEGER NOT NULL DEFAULT 0,
		last_updated_at TEXT NOT NULL DEFAULT '',
		last_recalled_at TEXT
	);

	CREATE INDEX IF NOT EXISTS idx_memories_player_name
		ON memories (player_name);

	CREATE INDEX IF NOT EXISTS idx_memories_type
		ON memories (type);

	CREATE TABLE IF NOT EXISTS conversation_messages (
    	id TEXT PRIMARY KEY,
    	player_name TEXT NOT NULL,
    	role TEXT NOT NULL,
    	content TEXT NOT NULL,
    	created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversation_messages_player_created
    	ON conversation_messages (player_name, created_at);
`);

//migration code
const existingColumns = database
	.prepare("PRAGMA table_info(memories)")
	.all() as Array<{ name: string }>;

const columnNames = new Set(existingColumns.map((column) => column.name));

function addColumnIfMissing(name: string, sql: string): void {
	if (!columnNames.has(name)) {
		database.exec(`ALTER TABLE memories ADD COLUMN ${sql}`);
	}
}

addColumnIfMissing("confidence", "confidence REAL NOT NULL DEFAULT 0.5");
addColumnIfMissing("reinforcement_count", "reinforcement_count INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("recall_count", "recall_count INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("last_updated_at", "last_updated_at TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("last_recalled_at", "last_recalled_at TEXT");
addColumnIfMissing("embedding_json", "embedding_json TEXT");
