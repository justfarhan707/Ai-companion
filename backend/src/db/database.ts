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
		created_at TEXT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_memories_player_name
		ON memories (player_name);

	CREATE INDEX IF NOT EXISTS idx_memories_type
		ON memories (type);
`);
