export type SayAction = {
	type: "say";
	text: string;
};

export type HuntEntityAction = {
	type: "hunt_entity";
	targetName: string;
};

export type RememberPlaceAction = {
	type: "remember_place";
	placeName: string;
};

export type StopAction = {
	type: "stop_action";
};

export type YuriAction =
	| SayAction
	| HuntEntityAction
	| RememberPlaceAction
	| StopAction;