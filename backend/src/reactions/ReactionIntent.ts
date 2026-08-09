//reaction intent type
export type ReactionUrgency = "low" | "medium" | "high" | "critical";

export type ReactionSource =
	| "danger"
	| "environment"
	| "discovery"
	| "need"
	| "memory"
	| "personality";

export type ReactionReason =
	| "CREEPER_NEARBY"
	| "PLAYER_LOW_HEALTH_WITH_HOSTILES"
	| "HOSTILE_MOBS_NEARBY"
	| "PASSIVE_MOBS_NEARBY"
	| "LAVA_NEARBY"
	| "UNDERGROUND_EXPLORATION"
	| "RARE_BLOCK_NEARBY"
	| "LOW_FOOD_WITH_HUNTABLE_ANIMAL";

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
