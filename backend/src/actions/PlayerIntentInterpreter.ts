const HUNTABLE_TARGETS = [
	"Pig",
	"Cow",
	"Chicken",
	"Sheep",
	"Rabbit",
];

export type PlayerCommandIntent =
	| {
		type: "hunt_entity";
		targetName: string;
	}
	| {
		type: "unknown";
	};

export class PlayerIntentInterpreter {
	interpret(message: string): PlayerCommandIntent {
		const normalized = message.toLowerCase();

		if (!normalized.includes("hunt") && !normalized.includes("chase") && !normalized.includes("get")) {
			return { type: "unknown" };
		}

		const target = HUNTABLE_TARGETS.find((name) =>
			normalized.includes(name.toLowerCase())
		);

		if (!target) {
			return { type: "unknown" };
		}

		return {
			type: "hunt_entity",
			targetName: target,
		};
	}
}