import type { PlanningContext } from "../planning/PlanningContext.js";
import type { YuriAction } from "../types/actions.js";
import type { ActionValidationResult, RejectedAction } from "./ActionValidation.js";
import { YuriToolRegistry } from "./YuriToolRegistry.js";


const HUNTABLE_FOOD_ANIMALS = new Set([
	"Pig",
	"Cow",
	"Chicken",
	"Sheep",
	"Rabbit",
]);

export class ActionValidator{

    private readonly toolRegistry = new YuriToolRegistry();

   	validate(actions: unknown[], context: PlanningContext): ActionValidationResult {
   		const validActions: YuriAction[] = [];
   		const rejectedActions: RejectedAction[] = [];

   		for (const action of actions) {
   			const result = this.validateOne(action, context);

   			if ("validAction" in result) {
   				validActions.push(result.validAction);
   			} else {
   				rejectedActions.push(result.rejectedAction);
   			}
   		}

   		return {
   			actions: validActions,
   			rejectedActions,
   		};
   	}

   	private validateOne(
   		action: unknown,
   		context: PlanningContext
   	): { validAction: YuriAction } | { rejectedAction: RejectedAction } {
   		if (!this.isObject(action) || typeof action.type !== "string") {
   			return {
   				rejectedAction: {
   					action,
   					reason: "invalid_shape",
   				},
   			};
   		}

		if (!this.toolRegistry.isKnownTool(action.type)) {
			return {
				rejectedAction: {
					action,
					reason: "unsupported_action",
				},
			};
		}

   		if (action.type === "say") {
   			if (typeof action.text !== "string" || action.text.trim().length === 0) {
   				return {
   					rejectedAction: {
   						action,
   						reason: "invalid_shape",
   					},
   				};
   			}

   			return {
   				validAction: {
   					type: "say",
   					text: action.text.trim(),
   				},
   			};
   		}
       	if (action.type === "hunt_entity") {
       			return this.validateHuntEntity(action, context);
       		}

        if (action.type === "remember_place") {
        	return this.validateRememberPlace(action);
        }

		if (action.type === "stop_action") {
			return {
				validAction: {
					type: "stop_action",
				},
			};
		}

        if (action.type === "go_to_place") {
        	return this.validateGoToPlace(action, context);
        }
       		return {
       			rejectedAction: {
       				action,
       				reason: "unsupported_action",
       			},
       			};
       	}

       private validateGoToPlace(
       	action: Record<string, unknown>,
       	context: PlanningContext,
       ): { validAction: YuriAction } | { rejectedAction: RejectedAction } {
       	if (typeof action.placeName !== "string" || action.placeName.trim().length === 0) {
       		return {
       			rejectedAction: {
       				action,
       				reason: "missing_target",
       			},
       		};
       	}

       	const placeName = action.placeName.trim().toLowerCase();

       		if (placeName.length > 40) {
        		return {
        			rejectedAction: {
        				action,
        				reason: "invalid_shape",
        			},
        		};
        	}

       	if (!this.findPlaceMemory(placeName, context)) {
       		return {
       			rejectedAction: {
       				action,
       				reason: "place_not_remembered",
       			},
       		};
       	}

        	return {
        		validAction: {
        			type: "go_to_place",
        			placeName,
        		},
        	};
        }

       private findPlaceMemory(placeName: string, context: PlanningContext): boolean {
       	const normalized = placeName.toLowerCase();

       	return context.relevantMemories.some((memory) =>
       		(memory.type === "home" || memory.type === "place") &&
       		(
       			memory.tags.includes(normalized) ||
       			memory.summary.toLowerCase().includes(` ${normalized} `) ||
       			memory.summary.toLowerCase().includes(`${normalized} is at`)
       		)
       	);
       }

       private validateRememberPlace(
       	action: Record<string, unknown>
       ): { validAction: YuriAction } | { rejectedAction: RejectedAction } {
       	if (typeof action.placeName !== "string" || action.placeName.trim().length === 0) {
       		return {
       			rejectedAction: {
       				action,
       				reason: "missing_target",
       			},
       		};
       	}

       	const placeName = action.placeName.trim().toLowerCase();

       	if (placeName.length > 40) {
       		return {
       			rejectedAction: {
       				action,
       				reason: "invalid_shape",
       			},
       		};
       	}

       	return {
       		validAction: {
       			type: "remember_place",
       			placeName,
       		},
       	};
       }

       private validateHuntEntity(
       		action: Record<string, unknown>,
       		context: PlanningContext
       	): { validAction: YuriAction } | { rejectedAction: RejectedAction } {
       		if (typeof action.targetName !== "string" || action.targetName.trim().length === 0) {
       			return {
       				rejectedAction: {
       					action,
       					reason: "missing_target",
       				},
       			};
       		}

       		const targetName = action.targetName.trim();

       		if (!HUNTABLE_FOOD_ANIMALS.has(targetName)) {
       			return {
       				rejectedAction: {
       					action,
       					reason: "target_not_huntable",
       				},
       			};
       		}
           const nearbyTarget = context.request.nearby.entityDetails?.find((entity) =>
           			entity.name === targetName
           		);

           		if (!nearbyTarget) {
           			return {
           				rejectedAction: {
           					action,
           					reason: "target_not_nearby",
           				},
           			};
           		}

           		if (nearbyTarget.distance > 16) {
           			return {
           				rejectedAction: {
           					action,
           					reason: "target_too_far",
           				},
           			};
           		}

           		return {
           			validAction: {
           				type: "hunt_entity",
           				targetName,
           			},
           		};
           	}
           	private isObject(value: unknown): value is Record<string, unknown> {
           		return typeof value === "object" && value !== null;
           	}
           }
