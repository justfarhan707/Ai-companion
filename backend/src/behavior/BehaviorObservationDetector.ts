import type { LiveStateTypes } from "../state/LiveStateTypes.js";
import type { BehaviorObservation } from "./BehaviorObservation.js";
import { WorldFeatureExtractor } from "./WorldFeatureExtractor.js";

export class BehaviorObservationDetector {
	private readonly featureExtractor = new WorldFeatureExtractor();

	detect(state: LiveStateTypes): BehaviorObservation[] {
		const features = this.featureExtractor.extract(state);
		const observations: BehaviorObservation[] = [];
		const now = new Date().toISOString();

		if (features.isUnderground && features.isCaveLike) {
			observations.push(this.createObservation(state, now, {
				situation: "Player is in or near a cave-like underground area.",
				playerAction: "Player continued exploring underground.",
				importance: 0.55,
				context: features,
			}));
		}

		if (features.hasVillageSignals) {
			observations.push(this.createObservation(state, now, {
				situation: "Player is near village-like activity.",
				playerAction: "Player spent time near villagers or village-like entities.",
				importance: 0.45,
				context: features,
			}));
		}

		if (features.hasLava || features.hasHostiles || features.isLowHealth) {
			observations.push(this.createObservation(state, now, {
				situation: "Player is near danger or in a risky condition.",
				playerAction: "Player remained active near danger.",
				importance: 0.65,
				context: features,
			}));
		}


		if (features.isHungry && features.hasPassiveAnimals) {
			observations.push(this.createObservation(state, now, {
				situation: "Player is hungry while passive animals are nearby.",
				playerAction: "Player had an opportunity to use nearby animals as food.",
				importance: 0.5,
				context: features,
			}));
		}

   		if (features.hasRareBlocks) {
   			observations.push(this.createObservation(state, now, {
   				situation: "Player is near rare mining resources.",
   				playerAction: "Player encountered valuable mining resources.",
   				importance: 0.7,
   				context: features,
   			}));
   		}

       		return observations;
       	}

    	private createObservation(
    		state: LiveStateTypes,
    		now: string,
    		input: {
    			situation: string;
    			playerAction: string;
    			context: Record<string, unknown>;
    			importance: number;
    		},
    	): BehaviorObservation {
    		return {
    			id: crypto.randomUUID(),
    			playerName: state.player.name,
    			situation: input.situation,
    			playerAction: input.playerAction,
    			context: {
    				...input.context,
    				world: state.player.world,
    				x: state.player.x,
    				y: state.player.y,
    				z: state.player.z,
    				danger: state.danger,
    				health: state.health,
    				hunger: state.hunger,
    				selectedItem: state.selectedItem,
    			},
    			importance: input.importance,
    			reflected: false,
    			createdAt: now,
    		};
    	}
    }