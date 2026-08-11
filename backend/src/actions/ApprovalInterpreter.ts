const APPROVAL_WORDS = new Set([
	"yes",
	"yeah",
	"yep",
	"yup",
	"sure",
	"ok",
	"okay",
	"do it",
	"go ahead",
	"please do",
]);

const REJECTION_WORDS = new Set([
	"no",
	"nope",
	"nah",
	"don't",
	"dont",
	"stop",
	"leave it",
	"not now",
]);

export type ApprovalDecision = "approved" | "rejected" | "unknown";

export class ApprovalInterpreter {
	interpret(message: string): ApprovalDecision {
		const normalized = message.trim().toLowerCase();

		for (const phrase of APPROVAL_WORDS) {
			if (normalized === phrase || normalized.includes(phrase)) {
				return "approved";
			}
		}

		for (const phrase of REJECTION_WORDS) {
			if (normalized === phrase || normalized.includes(phrase)) {
				return "rejected";
			}
		}

		return "unknown";
	}
}