export type BehaviorObservation = {
	id: string;
	playerName: string;
	situation: string;
	playerAction: string;
	context: Record<string, unknown>;
	importance: number;
	reflected: boolean;
	createdAt: string;
};