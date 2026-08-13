import type { YuriAction } from "../types/actions.js";

export type PlannedResponse = {
	reply: string;
	emotion: "friendly" | "lonely" | "possessive" | "angry";
	actions: YuriAction[];
};