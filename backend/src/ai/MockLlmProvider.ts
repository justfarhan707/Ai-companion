import type { LlmProvider } from "./LlmProvider.js";
import type { ChatRequest, ChatResponse } from "../types/chat.js";

export class MockLlmProvider implements LlmProvider {
    async chat(request: ChatRequest): Promise<ChatResponse> {
        const entities = request.nearby.entities.length > 0
            ? request.nearby.entities.join(", ")
            : "no nearby entities";

        const blocks = request.nearby.blocks.length > 0
            ? request.nearby.blocks.map((block) => `${block.name} x${block.count}`).join(", ")
            : "no notable blocks";

        return {
            reply:
                `I heard you, ${request.player.name}. ` +
                `You said: "${request.message}". ` +
                `You're in ${request.player.world} at x=${request.player.x}, y=${request.player.y}, z=${request.player.z}. ` +
                `Nearby entities: ${entities}. Nearby blocks: ${blocks}.`,
            emotion: "friendly",
            actions: [],
        };
    }
}