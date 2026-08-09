export type MemoryType =
	| "near_death"
	| "death"
	| "lava_danger"
	| "entered_cave"
	| "discovery"
	| "home"
	| "playstyle";

export type MemoryLocation = {
	world: string;
	x: number;
	y: number;
	z: number;
};

export type MemoryRecord = {
	id: string;
	playerName: string;
	type: MemoryType;
	summary: string;
	tags: string[];
	location: MemoryLocation;
	importance: number;
	confidence: number;
	reinforcementCount: number;
	recallCount: number;
	evidence: Record<string, unknown>;
	createdAt: string;
	lastUpdatedAt: string;
	lastRecalledAt?: string;
};
