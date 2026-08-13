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
import { PlanningContextBuilder } from "./planning/PlanningContextBuilder.js";
import { ActionValidator } from "./actions/ActionValidator.js";

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
const significantMemoryDetector = new SignificantMemoryDetector();
const messageMemoryTagger = new MessageMemoryTagger();
const proposalStore = new ProposalStore();
const approvalInterpreter = new ApprovalInterpreter();
const planningContextBuilder = new PlanningContextBuilder();
const actionValidator = new ActionValidator();

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

        const memoryTags = messageMemoryTagger.inferTags(chatRequest.message);
        const relevantMemories = longTermMemoryStore.findRelevant(
            chatRequest.player.name,
            memoryTags,
        );
        const planningContext = planningContextBuilder.build({
            request: chatRequest,
            liveState: liveStateStore.get(chatRequest.player.name),
            relevantMemories,
        });

       const planned = await llmProvider.plan(planningContext);
       const validation = actionValidator.validate(planned.actions, planningContext);

       const reply = validation.rejectedActions.length > 0 && validation.actions.length === 0
       	? "I can't do that safely from here."
       	: planned.reply;

       res.json({
       	...planned,
       	reply,
       	actions: validation.actions,
       	rejectedActions: validation.rejectedActions,
       	recalledMemories: relevantMemories,
       });

        res.json({
            ...planned,
            recalledMemories: relevantMemories,
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

	if (!event.player || !event.nearby) {
		res.status(400).json({ error: "event player and nearby are required" });
		return;
	}

	console.log("Event received:", event.type, event.player.name);

	const state = eventRouter.handle(event as GameEvent);
    const actions: YuriAction[] = [];
    const memories: MemoryRecord[] = [];
    const recalledMemories: MemoryRecord[] = [];

    if (state && "player" in state) {
        const detectedMemories = significantMemoryDetector.detect(state);

        for (const memory of detectedMemories) {
            const storedMemory = longTermMemoryStore.addOrReinforce(memory);
            memories.push(storedMemory);
        }

    	const intents = reactionEngine.evaluate(state);

    	for (const intent of intents) {
    		if (!chatterCooldownStore.canSpeak(state.player.name, intent)) {
    			continue;
    		}

            const relevantMemories = longTermMemoryStore.findRelevant(
                state.player.name,
                memoryTagsForReaction(intent.reason),
            );
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

app.listen(port, () => {
    console.log(`Yuri backend listening on http://localhost:${port}`);
});
