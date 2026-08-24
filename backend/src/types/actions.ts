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

export type GoToPlaceAction = {
	type: "go_to_place";
	placeName: string;
};

export type GoToPositionAction = {
	type: "go_to_position";
	placeName: string;
	world: string;
	x: number;
	y: number;
	z: number;
};

export type YuriAction =
	| SayAction
	| HuntEntityAction
	| RememberPlaceAction
	| GoToPlaceAction
	| GoToPositionAction
	| StopAction;