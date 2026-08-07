//returns intents

import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { ReactionIntent } from "./ReactionIntent.js";

const HOSTILE_MOBS = new Set([
	"Zombie",
	"Skeleton",
	"Creeper",
	"Spider",
	"Enderman",
	"Witch",
	"Drowned",
	"Husk",
	"Stray",
]);

const PASSIVE_MOBS = new Set([
	"Horse",
	"Pig",
	"Cow",
	"Sheep",
	"Chicken",
	"Rabbit",
	"Villager",
	"Cat",
	"Dog",
	"Wolf",
	"Bee",
	"Goat",
	"Camel",
	"Donkey",
	"Llama",
]);


export class ReactionEngine {
	evaluate(state: LiveStateTypes): ReactionIntent[] {
		const intents: ReactionIntent[] = [];
		const hostileMobs = state.nearby.entities.filter((entity) => HOSTILE_MOBS.has(entity));
		const passiveMobs = state.nearby.entities.filter((entity) => PASSIVE_MOBS.has(entity));

			if (hostileMobs.includes("Creeper")) {
        			intents.push({
        				kind: "speak",
        				urgency: "critical",
        				source: "danger",
        				reason: "CREEPER_NEARBY",
        				intent: "Warn the player immediately about a creeper nearby.",
        				context: {
        					hostileMobs,
        					health: state.health,
        				},
        				useLlm: false,
        				text: "Creeper!",
        			});
        		}

	   		if (hostileMobs.length > 0 && state.danger !== "high") {
       			intents.push({
       				kind: "speak",
       				urgency: "medium",
       				source: "danger",
       				reason: "HOSTILE_MOBS_NEARBY",
       				intent: "Yuri notices hostile mobs nearby and warns the player without panicking.",
       				context: {
       					hostileMobs,
       					health: state.health,
       				},
       				useLlm: true,
       			});
       		}
			if (passiveMobs.length > 0 && hostileMobs.length === 0) {
        			intents.push({
        				kind: "speak",
        				urgency: "medium",
        				source: "environment",
        				reason: "PASSIVE_MOBS_NEARBY",
        				intent: "Yuri notices passive animals or friendly creatures nearby and reacts naturally.",
        				context: {
        					passiveMobs,
        				},
        				useLlm: true,
        			});
        		}

        		return intents;
        	}
}
