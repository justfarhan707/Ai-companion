export type YuriToolDefinition = {
	type: string;
	description: string;
	requiresApproval: boolean;
	parameters: Array<{
		name: string;
		type: "string" | "number" | "boolean";
		required: boolean;
		description: string;
	}>;
};

export class YuriToolRegistry {
	private readonly tools: YuriToolDefinition[] = [
		{
			type: "say",
			description: "Speak naturally to the player.",
			requiresApproval: false,
			parameters: [
				{
					name: "text",
					type: "string",
					required: true,
					description: "The exact short message Yuri should say.",
				},
			],
		},
		{
			type: "hunt_entity",
			description: "Move toward and hunt a nearby passive food animal such as Pig, Cow, Sheep, Chicken, or Rabbit.",
			requiresApproval: true,
			parameters: [
				{
					name: "targetName",
					type: "string",
					required: true,
					description: "The nearby animal name to hunt.",
				},
			],
		},
    {
    	type: "remember_place",
    	description: "Remember the player's current location as a named place such as home, base, mine, village, farm, or portal.",
    	requiresApproval: false,
    	parameters: [
    		{
    			name: "placeName",
    			type: "string",
    			required: true,
    			description: "Short name for the place to remember, such as home, base, mine, village, farm, or portal.",
    		},
    	],
    },
    {
    	type: "stop_action",
    	description: "Cancel Yuri's current ongoing task such as hunting, mining, moving to a target, or any future long-running action. Yuri should remain awake and return to normal companion behavior.",
    	requiresApproval: false,
    	parameters: [],
    },

    {
    	type: "go_to_place",
    	description: "Move Yuri toward a remembered place such as home, base, mine, farm, village, or portal.",
    	requiresApproval: false,
    	parameters: [
    		{
    			name: "placeName",
    			type: "string",
    			required: true,
    			description: "Short remembered place name, such as home, base, mine, village, farm, or portal.",
    		},
    	],
    },
	];

	getAvailableTools(): YuriToolDefinition[] {
		return this.tools;
	}

	getTool(type: string): YuriToolDefinition | undefined {
		return this.tools.find((tool) => tool.type === type);
	}

	isKnownTool(type: string): boolean {
		return this.getTool(type) !== undefined;
	}
}
