import type { ChatRequest } from "../types/chat.js";
import type { YuriAction } from "../types/actions.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import { LongTermMemoryStore } from "../memory/LongTermMemoryStore.js";
import { MemoryEmbeddingService } from "../memory/embedding/MemoryEmbeddingService.js";

export type BackendActionExecutionResult = {
	javaActions: YuriAction[];
	memories: MemoryRecord[];
};

export class BackendActionExecutor {
	constructor(
		private readonly memoryStore: LongTermMemoryStore,
		private readonly memoryEmbeddingService: MemoryEmbeddingService,
	) {
	}

	execute(input: {
		request: ChatRequest;
		actions: YuriAction[];
	}): BackendActionExecutionResult {
		const javaActions: YuriAction[] = [];
		const memories: MemoryRecord[] = [];

		for (const action of input.actions) {
			if (action.type === "remember_place") {
				const memory = this.rememberPlace(input.request, action.placeName);
				memories.push(memory);
				this.memoryEmbeddingService.embedAndStore(memory).catch((error) => {
					const message = error instanceof Error ? error.message : "Unknown embedding error";
					console.warn(`Failed to embed remembered place ${memory.id}: ${message}`);
				});
				continue;
			}

			javaActions.push(action);
		}

        		return {
        			javaActions,
        			memories,
        		};
        	}

        	private rememberPlace(request: ChatRequest, placeName: string): MemoryRecord {
        		const now = new Date().toISOString();
        		const type = placeName === "home" || placeName === "base" ? "home" : "place";

        		const memory = this.memoryStore.addOrReinforce({
        			id: crypto.randomUUID(),
        			playerName: request.player.name,
        			type,
        			summary: `${request.player.name}'s ${placeName} is at x=${request.player.x}, y=${request.player.y}, z=${request.player.z} in ${request.player.world}.`,
        			tags: ["place", placeName, type],
        			location: {
        				world: request.player.world,
        				x: request.player.x,
        				y: request.player.y,
        				z: request.player.z,
        			},
        			importance: type === "home" ? 0.9 : 0.75,
        			confidence: 0.95,
        			reinforcementCount: 1,
        			recallCount: 0,
        			evidence: {
        				playerMessage: request.message,
        							toolAction: "remember_place",
                        				placeName,
                        			},
                        			createdAt: now,
                        			lastUpdatedAt: now,
                        		});

                        		return memory;
                        	}
                        }
