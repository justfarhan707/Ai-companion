export type PlayerContext = {
    name: string;
    world: string;
    x: number;
    y: number;
    z: number;
};

export type NearbyBlock = {
    name: string;
    count: number;
};

export type NearbyContext = {
	entities: string[];
	entityDetails?: NearbyEntity[];
	blocks: NearbyBlock[];
};

export type ChatRequest = {
	message: string;
	player: PlayerContext;
	nearby: NearbyContext;
	hunger?: number;
	selectedItem?: string;
	inventory?: InventorySummary;
};

export type ChatAction = {
    type: string;
    payload?: unknown;
};

export type ChatResponse = {
    reply: string;
    emotion: "friendly" | "lonely" | "possessive" | "angry";
    actions: ChatAction[];
};

export type NearbyEntity = {
	name: string;
	distance: number;
};

export type InventoryItem = {
	name: string;
	count: number;
};

export type InventorySummary = {
	foodItems: InventoryItem[];
	totalFoodCount: number;
};