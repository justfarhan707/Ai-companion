//this file is how Yuri decides what to remember right now
import type { ChatRequest } from "../types/chat.js";
import type { ConversationMessage } from "../conversation/ConversationMessage.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { MemoryRecord } from "./MemoryRecord.js";
import { LongTermMemoryStore } from "./LongTermMemoryStore.js";
import { MessageMemoryTagger } from "./MessageMemoryTagger.js";

export type MemoryRecallInput = {
	playerName: string;
	message: string;
	request?: ChatRequest;
	liveState?: LiveStateTypes;
	recentMessages?: ConversationMessage[];
	limit?: number;
};

export type MemoryRecallDebugItem = {
	memoryId: string;
	summary: string;
	reasons: string[];
};

export type MemoryRecallResult = {
	memories: MemoryRecord[];
	debug: MemoryRecallDebugItem[];
	queryText: string;
	tags: string[];
};

export class MemoryRecallService {
	constructor(
		private readonly longTermMemoryStore: LongTermMemoryStore,
		private readonly messageMemoryTagger: MessageMemoryTagger
	) {
	}

	recall(input: MemoryRecallInput): MemoryRecallResult {
		const queryText = this.buildQueryText(input);
		const tags = this.inferTags(input, queryText);
		const memories = this.longTermMemoryStore.findRelevant(
			input.playerName,
			tags,
			input.limit ?? 5,
		);

		return {
			memories,
			debug: memories.map((memory) => ({
				memoryId: memory.id,
				summary: memory.summary,
				reasons: this.explainRecall(memory, tags),
			})),
			queryText,
			tags,
		};
	}

    private buildQueryText(input: MemoryRecallInput): string {
    		const parts: string[] = [];

    		if (input.message.trim().length > 0) {
    			parts.push(`Player message: ${input.message}`);
    		}

    		const state = input.liveState;
    		const request = input.request;

    		const hunger = request?.hunger ?? state?.hunger;
    		const health = state?.health;
    		const selectedItem = request?.selectedItem ?? state?.selectedItem;
    		const entities = request?.nearby.entities ?? state?.nearby.entities ?? [];
    		const blocks = request?.nearby.blocks ?? state?.nearby.blocks ?? [];

    		if (health !== undefined) {
    			parts.push(`Health: ${health}`);
    		}

    		if (hunger !== undefined) {
    			parts.push(`Hunger: ${hunger}`);
    		}

    		if (selectedItem) {
    			parts.push(`Selected item: ${selectedItem}`);
    		}

       		if (entities.length > 0) {
       			parts.push(`Nearby entities: ${entities.join(", ")}`);
       		}

       		if (blocks.length > 0) {
       			parts.push(`Nearby blocks: ${blocks.map((block) => block.name).join(", ")}`);
       		}

       		return parts.join("\n");
       	}

       	private inferTags(input: MemoryRecallInput, queryText: string): string[] {
       		const tags = new Set<string>();

       		for (const tag of this.messageMemoryTagger.inferTags(input.message)) {
       			tags.add(tag);
       		}

       		for (const tag of this.messageMemoryTagger.inferTags(queryText)) {
       			tags.add(tag);
       		}

       		return [...tags];
       	}


	    private explainRecall(memory: MemoryRecord, tags: string[]): string[] {
            const reasons: string[] = [];

            const matchedTags = memory.tags.filter((tag) => tags.includes(tag));

            if (matchedTags.length > 0) {
                reasons.push(`matched_tags:${matchedTags.join(",")}`);
            }

            if (memory.importance >= 0.8) {
                reasons.push("high_importance");
            }

            if (memory.reinforcementCount > 1) {
                reasons.push(`reinforced:${memory.reinforcementCount}`);
            }

            return reasons;
        }
}