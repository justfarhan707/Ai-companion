export type ConversationRole = "player" | "yuri";

export type ConversationMessage = {
	id: string;
	playerName: string;
	role: ConversationRole;
	content: string;
	createdAt: string;
};

