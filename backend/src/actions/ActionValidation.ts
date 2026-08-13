//type
import type { YuriAction } from "../types/actions.js";

export type RejectedAction = {
	action: unknown;
	reason:
		| "invalid_shape"
		| "unsupported_action"
		| "missing_target"
		| "target_not_huntable"
		| "target_not_nearby"
		| "target_too_far";
};

export type ActionValidationResult = {
    actions: YuriAction[];
    rejectedActions: RejectedAction[];
    }
