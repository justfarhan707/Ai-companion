import type { MemoryType } from "../MemoryRecord.js";

export type ExtractedMemoryCandidate = {
	shouldRemember: boolean;
	type: MemoryType;
	summary: string;
	tags: string[];
	importance: number;
	confidence: number;
};