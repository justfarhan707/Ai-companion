export type ProposedActionType = "hunt_entity";

export type ProposedAction = {
	id: string;
	playerName: string;
	type: ProposedActionType;
	targetName: string;
	reason: string;
	createdAt: string;
	expiresAt: string;
};