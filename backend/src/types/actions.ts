export type SayAction = {
	type: "say";
	text: string;
};

export type HuntEntityAction = {
	type: "hunt_entity";
	targetName: string;
};

export type YuriAction = SayAction | HuntEntityAction;
