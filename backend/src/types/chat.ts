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
    blocks: NearbyBlock[];
};

export type ChatRequest = {
    message: string;
    player: PlayerContext;
    nearby: NearbyContext;
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