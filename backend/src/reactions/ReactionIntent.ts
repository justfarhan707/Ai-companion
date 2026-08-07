//reaction intent type
export type ReactionUrgency = "low" | "medium" | "high" | "critical";

export type ReactionSource =
	| "danger"
	| "environment"
	| "memory"
	| "personality";

export type ReactionReason =
	| "CREEPER_NEARBY"
	| "PLAYER_LOW_HEALTH_WITH_HOSTILES"
	| "HOSTILE_MOBS_NEARBY"
	| "PASSIVE_MOBS_NEARBY";

export type ReactionIntent = {
	kind: "speak";
	urgency: ReactionUrgency;
	source: ReactionSource;
	reason: ReactionReason;
	intent: string;
	context: Record<string, unknown>;
	useLlm: boolean;
	text?: string;
};