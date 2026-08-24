import "dotenv/config";
import { GeminiProvider } from "./ai/GeminiProvider.js";
import express from "express";
import cors from "cors";
import { MockLlmProvider } from "./ai/MockLlmProvider.js";
import type { ChatRequest } from "./types/chat.js";
import { EventRouter } from "./events/EventRouter.js";
import { LiveStateStore } from "./state/LiveStateStore.js";
import type { GameEvent } from "./types/events.js";
import { ReactionEngine } from "./reactions/ReactionEngine.js";
import { ChatterCooldownStore } from "./chatter/ChatterCooldownStore.js";
import { ReactionSpeechGenerator } from "./reactions/ReactionSpeechGenerator.js";
import { LongTermMemoryStore } from "./memory/LongTermMemoryStore.js";
import { SignificantMemoryDetector } from "./memory/SignificantMemoryDetector.js";
import type { YuriAction } from "./types/actions.js";
import type { MemoryRecord } from "./memory/MemoryRecord.js";
import { MessageMemoryTagger } from "./memory/MessageMemoryTagger.js";
import { ProposalStore } from "./actions/ProposalStore.js";
import { ApprovalInterpreter } from "./actions/ApprovalInterpreter.js";
import { BackendActionExecutor } from "./actions/BackendActionExecutor.js";
import { PlanningContextBuilder } from "./planning/PlanningContextBuilder.js";
import { ActionValidator } from "./actions/ActionValidator.js";
import { ResponseReconciler } from "./planning/ResponseReconciler.js";
import { ConversationStore } from "./conversation/ConversationStore.js";
import { GeminiMemoryExtractor } from "./memory/extraction/GeminiMemoryExtractor.js";
import { ChatMemoryExtractor } from "./memory/ChatMemoryExtractor.js";
import { MemoryRecallService } from "./memory/MemoryRecallService.js";
import { GeminiEmbeddingProvider } from "./memory/embedding/GeminiEmbeddingProvider.js";
import { MemoryEmbeddingService } from "./memory/embedding/MemoryEmbeddingService.js";
import { LanceDbMemoryVectorIndex } from "./memory/vector/LanceDbMemoryVectorIndex.js";
import { BehaviorObservationStore } from "./behavior/BehaviorObservationStore.js";
import { BehaviorObservationDetector } from "./behavior/BehaviorObservationDetector.js";
import { BehaviorReflectionService } from "./behavior/BehaviorReflectionService.js";
import { BehaviorMemoryWriter } from "./behavior/BehaviorMemoryWriter.js";

const app = express();
const port = 3001;
const llmProvider = process.env.LLM_PROVIDER === "gemini"
    ? new GeminiProvider()
    : new MockLlmProvider();
const liveStateStore = new LiveStateStore();
const eventRouter = new EventRouter(liveStateStore);// give eventrouter the liveStatestore object
const reactionEngine = new ReactionEngine();
const chatterCooldownStore = new ChatterCooldownStore();
const reactionSpeechGenerator = new ReactionSpeechGenerator(llmProvider);
const longTermMemoryStore = new LongTermMemoryStore();
const memoryVectorIndex = new LanceDbMemoryVectorIndex();
const significantMemoryDetector = new SignificantMemoryDetector();
const messageMemoryTagger = new MessageMemoryTagger();
const embeddingProvider = new GeminiEmbeddingProvider();
const memoryRecallService = new MemoryRecallService(
    longTermMemoryStore,
    messageMemoryTagger,
    embeddingProvider,
    memoryVectorIndex,
);
const proposalStore = new ProposalStore();
const approvalInterpreter = new ApprovalInterpreter();
const planningContextBuilder = new PlanningContextBuilder();
const actionValidator = new ActionValidator();
const responseReconciler = new ResponseReconciler();
const conversationStore = new ConversationStore();
const chatMemoryExtractor = new ChatMemoryExtractor(new GeminiMemoryExtractor()); //creating two objects at once
const memoryEmbeddingService = new MemoryEmbeddingService(
    longTermMemoryStore,
    embeddingProvider,
    memoryVectorIndex,
);
const backendActionExecutor = new BackendActionExecutor(
    longTermMemoryStore,
    memoryEmbeddingService,
);
const behaviorObservationStore = new BehaviorObservationStore();
const behaviorObservationDetector = new BehaviorObservationDetector();
const behaviorReflectionService = new BehaviorReflectionService();
const behaviorMemoryWriter = new BehaviorMemoryWriter();


app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "yuri-backend",
    });
});

app.post("/chat", async (req, res) => {
    const request = (req.body ?? {}) as Partial<ChatRequest>;

    if (!request.message || !request.player || !request.nearby) {
        res.status(400).json({
            error: "message, player, and nearby are required",
        });
        return;
    }

    try {
        const chatRequest: ChatRequest = {
            message: String(request.message).trim(),
            player: {
                name: String(request.player.name),
                world: String(request.player.world),
                x: Number(request.player.x),
                y: Number(request.player.y),
                z: Number(request.player.z),
            },
            nearby: {
                entities: Array.isArray(request.nearby.entities)
                    ? request.nearby.entities.map(String)
                    : [],
                entityDetails: Array.isArray(request.nearby.entityDetails)
                    ? request.nearby.entityDetails.map((entity) => ({
                        name: String(entity.name),
                        distance: Number(entity.distance),
                    }))
                    : undefined,
                blocks: Array.isArray(request.nearby.blocks)
                    ? request.nearby.blocks.map((block) => ({
                        name: String(block.name),
                        count: Number(block.count),
                    }))
                    : [],
            },
            hunger: request.hunger === undefined ? undefined : Number(request.hunger),
            selectedItem: request.selectedItem === undefined ? undefined : String(request.selectedItem),
            inventory: request.inventory
                ? {
                    foodItems: Array.isArray(request.inventory.foodItems)
                        ? request.inventory.foodItems.map((item) => ({
                            name: String(item.name),
                            count: Number(item.count),
                        }))
                        : [],
                    totalFoodCount: Number(request.inventory.totalFoodCount ?? 0),
                }
                : undefined,
        };
        conversationStore.add({
            playerName: chatRequest.player.name,
            role: "player",
            content: chatRequest.message,
        });

        //yes or no resolver checks for approvals if there are
        const pendingProposal = proposalStore.get(chatRequest.player.name);
        const approvalDecision = pendingProposal
            ? approvalInterpreter.interpret(chatRequest.message) //check if there is yes or no in chat
            : "unknown";

        if (pendingProposal && approvalDecision === "approved") {
            const proposal = proposalStore.consume(chatRequest.player.name);

            if (proposal?.type === "hunt_entity") {
                res.json({
                    reply: `Okay, I'll hunt the ${proposal.targetName}.`,
                    emotion: "friendly",
                    actions: [
                        {
                            type: "hunt_entity",
                            targetName: proposal.targetName,
                        },
                    ],
                    approvedProposal: proposal,
                    recalledMemories: [],
                });
                return;
            }
        }

        if (pendingProposal && approvalDecision === "rejected") {
            proposalStore.clear(chatRequest.player.name);

            res.json({
                reply: "Okay, I'll leave it alone.",
                emotion: "friendly",
                actions: [],
                rejectedProposal: pendingProposal,
                recalledMemories: [],
            });
            return;
        }
        const recentMessages = conversationStore.getRecent(chatRequest.player.name, 10);
        const memoryRecall = await memoryRecallService.recall({
            playerName: chatRequest.player.name,
            message: chatRequest.message,
            request: chatRequest,
            liveState: liveStateStore.get(chatRequest.player.name),
            recentMessages,
            limit: 5,
        });

        const relevantMemories = memoryRecall.memories;
        const planningContext = planningContextBuilder.build({
            request: chatRequest,
            liveState: liveStateStore.get(chatRequest.player.name),
            relevantMemories,
            recentMessages,
        });

        const planned = await llmProvider.plan(planningContext);
        const validation = actionValidator.validate(planned.actions, planningContext);
        const finalResponse = responseReconciler.reconcile(planned, validation, planningContext);
        const backendActionResult = backendActionExecutor.execute({
            request: chatRequest,
            actions: finalResponse.actions,
            relevantMemories,
        });

        conversationStore.add({
            playerName: chatRequest.player.name,
            role: "yuri",
            content: finalResponse.reply,
        });

        const extractedMemories = await chatMemoryExtractor.extract({
            request: chatRequest,
            yuriReply: finalResponse.reply,
            recentMessages,
        });

        const storedChatMemories = extractedMemories.map((memory) =>
            longTermMemoryStore.addOrReinforce(memory)
        );

        embedMemoriesInBackground(storedChatMemories);

        res.json({
            ...finalResponse,
            actions: backendActionResult.javaActions,
            rejectedActions: validation.rejectedActions,
            backendExecutedMemories: backendActionResult.memories,
            recalledMemories: relevantMemories,
            memoryRecallDebug: memoryRecall.debug,
            memoryRecallQuery: memoryRecall.queryText,
            memoryRecallTags: memoryRecall.tags,
            memoryRecallCandidateCount: memoryRecall.candidateCount,
            memoryRecallVectorResultCount: memoryRecall.vectorResultCount,
            memoryRecallQueryHints: {
                preferredTypes: memoryRecall.query.preferredTypes,
                avoidTypes: memoryRecall.query.avoidTypes,
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown backend error";

        res.status(503).json({
            reply: "I'm having trouble thinking right now. Try again in a moment.",
            emotion: "friendly",
            actions: [],
            error: message,
        });
    }
});


app.post("/events", async (req, res) => {
    const event = (req.body ?? {}) as Partial<GameEvent>;

    if (!event.type) {
        res.status(400).json({ error: "event type is required" });
        return;
    }

    if (!event.player) {
        res.status(400).json({ error: "event player is required" });
        return;
    }

    console.log("Event received:", event.type, event.player.name);

    //tookeep action completed events seprate from playerStateEvent

    if (event.type === "YuriActionCompleted") {
        if (!event.action) {
            res.status(400).json({ error: "event action is required" });
            return;
        }

        const now = new Date().toISOString();

        const memory = longTermMemoryStore.addOrReinforce({
            id: crypto.randomUUID(),
            playerName: event.player.name,
            type: "yuri_helped",
            summary: `Yuri helped ${event.player.name} by hunting a ${event.action.targetName}.`,
            tags: ["yuri_helped", "hunting", "food", "survival"],
            location: {
                world: event.player.world,
                x: event.player.x,
                y: event.player.y,
                z: event.player.z,
            },
            importance: 0.65,
            confidence: 0.9,
            reinforcementCount: 1,
            recallCount: 0,
            evidence: {
                action: event.action.type,
                targetName: event.action.targetName,
                result: event.action.result,
            },
            createdAt: now,
            lastUpdatedAt: now,
        });

        embedMemoriesInBackground([memory]);

        res.json({
            accepted: true,
            memories: [memory],
            actions: [],
            recalledMemories: [],
        });
        return;
    }

    if (!("nearby" in event) || !event.nearby) {
        res.status(400).json({ error: "event nearby is required" });
        return;
    }

    const state = eventRouter.handle(event as GameEvent);
    const actions: YuriAction[] = [];
    const memories: MemoryRecord[] = [];
    const recalledMemories: MemoryRecord[] = [];

    if (state && "player" in state) {
        const detectedMemories = significantMemoryDetector.detect(state);

        for (const memory of detectedMemories) {
            const storedMemory = longTermMemoryStore.addOrReinforce(memory);
            memories.push(storedMemory);
            embedMemoriesInBackground([storedMemory]);
        }

        const behaviorObservations = behaviorObservationDetector.detect(state);

        for (const observation of behaviorObservations) {
            behaviorObservationStore.add(observation);
        }

        const unreflectedBehaviorObservations = behaviorObservationStore.getUnreflected(
            state.player.name,
            12,
        );

        if (unreflectedBehaviorObservations.length >= 8) {
            try {
                const reflection = await behaviorReflectionService.reflect({
                    playerName: state.player.name,
                    observations: unreflectedBehaviorObservations,
                });

                behaviorObservationStore.markReflected(
                    unreflectedBehaviorObservations.map((observation) => observation.id),
                );

                const behaviorMemory = behaviorMemoryWriter.toMemory({
                    playerName: state.player.name,
                    reflection,
                    observations: unreflectedBehaviorObservations,
                });

                if (behaviorMemory) {
                    const storedMemory = longTermMemoryStore.addOrReinforce(behaviorMemory);
                    memories.push(storedMemory);
                    embedMemoriesInBackground([storedMemory]);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown behavior reflection error";
                console.warn(`Behavior reflection failed for ${state.player.name}: ${message}`);
            }
        }

        const intents = reactionEngine.evaluate(state);
        const recentMessages = conversationStore.getRecent(state.player.name, 10);

        for (const intent of intents) {
            if (!chatterCooldownStore.canSpeak(state.player.name, intent)) {
                continue;
            }

            const memoryRecall = await memoryRecallService.recall({
                playerName: state.player.name,
                message: reactionMemoryQuery(intent.reason, intent.intent, state),
                liveState: state,
                recentMessages,
                limit: 3,
            });

            const relevantMemories = memoryRecall.memories;
            recalledMemories.push(...relevantMemories);

            actions.push(await reactionSpeechGenerator.generate(
                state.player.name,
                state,
                intent,
                relevantMemories,
            ));

            if (intent.reason === "LOW_FOOD_WITH_HUNTABLE_ANIMAL") {
                const targetAnimal = intent.context.targetAnimal;

                if (typeof targetAnimal === "string") {
                    const proposal = proposalStore.create({
                        playerName: state.player.name,
                        type: "hunt_entity",
                        targetName: targetAnimal,
                        reason: intent.reason,
                    });

                    console.log("Proposal created:", proposal);
                }
            }
        }
    }

    //for debugginf creation of proposal
    const pendingProposal = state && "player" in state
        ? proposalStore.get(state.player.name)
        : undefined;

    res.json({
        accepted: true,
        state,
        actions,
        memories,
        recalledMemories,
        pendingProposal,
    });
});

app.get("/memory/:playerName", (req, res) => {
    const playerName = req.params.playerName;

    res.json({
        playerName,
        memories: longTermMemoryStore.getForPlayer(playerName),
    });
});

app.post("/memory/:playerName/backfill-embeddings", async (req, res) => {
    const playerName = req.params.playerName;
    const requestedLimit = Number(req.body?.limit ?? 50);

    try {
        const result = await memoryEmbeddingService.backfillMissingEmbeddings({
            playerName,
            limit: Number.isFinite(requestedLimit) ? requestedLimit : 50,
        });

        res.json({
            playerName,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown backfill error";

        res.status(503).json({
            playerName,
            error: message,
        });
    }
});

app.post("/memory/:playerName/reindex-vectors", async (req, res) => {
    const playerName = req.params.playerName;
    const requestedLimit = Number(req.body?.limit ?? 500);

    try {
        const result = await memoryEmbeddingService.reindexExistingEmbeddings({
            playerName,
            limit: Number.isFinite(requestedLimit) ? requestedLimit : 500,
        });

        res.json({
            playerName,
            ...result,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown vector reindex error";

        res.status(503).json({
            playerName,
            error: message,
        });
    }
});

function memoryTagsForReaction(reason: string): string[] {
    switch (reason) {
        case "PLAYER_LOW_HEALTH_WITH_HOSTILES":
            return ["danger", "near_death", "hostile_mobs", "death"];

        case "HOSTILE_MOBS_NEARBY":
            return ["danger", "hostile_mobs", "near_death", "death"];

        case "CREEPER_NEARBY":
            return ["danger", "hostile_mobs", "near_death", "death"];

        case "LAVA_NEARBY":
            return ["danger", "lava", "cave", "death"];

        case "UNDERGROUND_EXPLORATION":
            return ["cave", "underground", "exploration", "danger"];

        case "RARE_BLOCK_NEARBY":
            return ["discovery", "rare_block", "mining"];

        case "LOW_FOOD_WITH_HUNTABLE_ANIMAL":
            return ["food", "hunger", "hunting", "survival", "need"];

        default:
            return [];
    }
}

function embedMemoriesInBackground(memories: MemoryRecord[]): void {
    for (const memory of memories) {
        memoryEmbeddingService.embedAndStore(memory).catch((error) => {
            const message = error instanceof Error ? error.message : "Unknown embedding error";
            console.warn(`Failed to embed memory ${memory.id}: ${message}`);
        });
    }
}

function reactionMemoryQuery(reason: string, intent: string, state: ReturnType<LiveStateStore["get"]>): string {
    const nearbyEntities = state?.nearby.entities.join(", ") || "none";
    const nearbyBlocks = state?.nearby.blocks
        .map((block) => block.name)
        .join(", ") || "none";

return [
	`Current Minecraft event: ${reason}.`,
	`Yuri intent: ${intent}`,
	`Player health: ${state?.health ?? "unknown"}.`,
	`Player hunger: ${state?.hunger ?? "unknown"}.`,
	`Current danger level: ${state?.danger ?? "unknown"}.`,
	`Nearby entities: ${nearbyEntities}.`,
	`Nearby blocks: ${nearbyBlocks}.`,
	`Useful memory tags: ${memoryTagsForReaction(reason).join(", ") || "none"}.`,
	"Recall playstyle memories learned from behavioral reflection when relevant.",
	"Recall past player memories, dangers, preferences, instructions, or places that are relevant to this situation.",
].join("\n");
}

app.listen(port, () => {
    console.log(`Yuri backend listening on http://localhost:${port}`);
});
