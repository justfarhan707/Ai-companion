
//build a context and tell available actions to gemini
import type { ChatRequest } from "../types/chat.js";
import type { MemoryRecord } from "../memory/MemoryRecord.js";
import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { PlanningContext } from "./PlanningContext.js";

export class PlanningContextBuilder {
	build(input: {
		request: ChatRequest;
		liveState?: LiveStateTypes;
		relevantMemories: MemoryRecord[];
	}): PlanningContext {
		return {
			request: input.request,
			liveState: input.liveState,
			relevantMemories: input.relevantMemories,
			availableActions: [
				{
					type: "say",
					description: "Speak naturally to the player.",
					requiresApproval: false,
				},
				{
					type: "hunt_entity",
					description: "Ask Yuri to move toward a nearby passive food animal such as Pig, Cow, Sheep, Chicken, or Rabbit.",
					requiresApproval: true,
				},
			],
		};
	}
}