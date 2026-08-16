import { database } from "../db/database.js";
import type { ConversationMessage, ConversationRole } from "./ConversationMessage.js";

type ConversationMessageRow = {
	id: string;
	player_name: string;
	role: ConversationRole;
	content: string;
	created_at: string;
};

export class ConversationStore {
	private readonly insertMessage = database.prepare(`
		INSERT INTO conversation_messages (
			id,
			player_name,
			role,
			content,
			created_at
		) VALUES (
			@id,
			@playerName,
			@role,
			@content,
			@createdAt
		)
	`);

	private readonly selectRecentMessages = database.prepare(`
		SELECT
			id,
			player_name,
			role,
			content,
			created_at
		FROM conversation_messages
		WHERE player_name = ?
		ORDER BY created_at DESC
		LIMIT ?
	`);

	add(input: {
		playerName: string;
		role: ConversationRole;
		content: string;
	}): ConversationMessage {
		const now = new Date().toISOString();

		const message: ConversationMessage = {
			id: crypto.randomUUID(),
			playerName: input.playerName,
			role: input.role,
			content: input.content,
			createdAt: now,
		};
		this.insertMessage.run(message);

		return message;
	}

	getRecent(playerName: string, limit = 10): ConversationMessage[] {
		const rows = this.selectRecentMessages.all(playerName, limit) as ConversationMessageRow[];

		return rows
			.map((row) => ({
				id: row.id,
				playerName: row.player_name,
				role: row.role,
				content: row.content,
				createdAt: row.created_at,
			}))
			.reverse();
	}
}