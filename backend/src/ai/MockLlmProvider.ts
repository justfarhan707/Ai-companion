import type { LlmProvider } from "./LlmProvider.js";
import type { ChatResponse } from "../types/chat.js";
import type { LlmChatInput } from "./LlmChatInput.js";
import type { LlmReactionInput } from "./LlmReactionInput.js";

export class MockLlmProvider implements LlmProvider {
    async chat(input: LlmChatInput): Promise<ChatResponse> {
        const request = input.request;
        const liveState = input.liveState;
        const entities = request.nearby.entities.length > 0
            ? request.nearby.entities.join(", ")
            : "no nearby entities";

        const blocks = request.nearby.blocks.length > 0
            ? request.nearby.blocks.map((block) => `${block.name} x${block.count}`).join(", ")
            : "no notable blocks";
        const danger = liveState?.danger ?? "unknown";

        return {
            reply:
                `I heard you, ${request.player.name}. ` +
                `You said: "${request.message}". ` +
                `You're in ${request.player.world} at x=${request.player.x}, y=${request.player.y}, z=${request.player.z}. ` +
                `Current danger: ${danger}. ` +
                `Nearby entities: ${entities}. Nearby blocks: ${blocks}.`,
            emotion: "friendly",
            actions: [],
        };
    }

    async react(input: LlmReactionInput): Promise<ChatResponse> {
        return {
            reply: `[mock reaction] ${input.intent.intent}`,
            emotion: "friendly",
            actions: [],
        };
    }
}
