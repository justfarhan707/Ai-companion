import type { ActionValidationResult, RejectedAction } from "../actions/ActionValidation.js";
import type { PlannedResponse } from "./PlannedResponse.js";
import type { PlanningContext } from "./PlanningContext.js";

const ACTION_WORDS = [
	"hunt",
	"kill",
	"attack",
	"get",
	"bring",
	"give",
	"take",
	"come",
	"go",
	"follow",
	"teleport",
	"help",
];

export class ResponseReconciler {
	reconcile(
		planned: PlannedResponse,
		validation: ActionValidationResult,
		context: PlanningContext
	): PlannedResponse {
		const rejectedReply = validation.actions.length === 0 && this.isActionRequest(context.request.message)
			? this.replyForRejectedActions(validation.rejectedActions)
			: undefined;

		return {
			...planned,
			reply: rejectedReply ?? planned.reply,
			actions: validation.actions,
		};
	}

   	private replyForRejectedActions(rejectedActions: RejectedAction[]): string | undefined {
   		const first = rejectedActions[0];

   		if (!first) {
   			return undefined;
   		}

    	if (!first) {
    			return undefined;
    		}

    		switch (first.reason) {
    			case "target_too_far":
    				return "That target is too far away for me to reach safely.";

    			case "target_not_nearby":
    				return "I can't see that target nearby.";

    			case "target_not_huntable":
    				return "I don't think I should hunt that.";

    			case "missing_target":
    				return "Tell me what you want me to hunt.";

    			case "unsupported_action":
    				return "I can't do that yet.";

    			default:
    				return "I can't do that safely right now.";
    		}
    	}

	private isActionRequest(message: string): boolean {
		const normalized = message.toLowerCase();
		return ACTION_WORDS.some((word) => normalized.includes(word));
	}
    }
