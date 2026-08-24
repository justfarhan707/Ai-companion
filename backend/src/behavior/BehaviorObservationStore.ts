import { database } from "../db/database.js";
import type { BehaviorObservation } from "./BehaviorObservation.js";

type BehaviorObservationRow = {
	id: string;
	player_name: string;
	situation: string;
	player_action: string;
	context_json: string;
	importance: number;
	reflected: number;
	created_at: string;
};

export class BehaviorObservationStore {
	private readonly insertObservation = database.prepare(`
		INSERT INTO behavior_observations (
			id,
			player_name,
			situation,
			player_action,
			context_json,
			importance,
			reflected,
			created_at
		) VALUES (
			@id,
			@playerName,
			@situation,
			@playerAction,
			@contextJson,
			@importance,
			@reflected,
			@createdAt
		)
	`);

	private readonly selectUnreflected = database.prepare(`
		SELECT
			id,
			player_name,
			situation,
			player_action,
			context_json,
			importance,
			reflected,
			created_at
		FROM behavior_observations
		WHERE player_name = ?
		  AND reflected = 0
		ORDER BY created_at ASC
		LIMIT ?
	`);

	add(observation: BehaviorObservation): void {
		this.insertObservation.run({
			id: observation.id,
			playerName: observation.playerName,
			situation: observation.situation,
			playerAction: observation.playerAction,
			contextJson: JSON.stringify(observation.context),
			importance: observation.importance,
			reflected: observation.reflected ? 1 : 0,
			createdAt: observation.createdAt,
		});
	}

	getUnreflected(playerName: string, limit = 12): BehaviorObservation[] {
		const rows = this.selectUnreflected.all(playerName, limit) as BehaviorObservationRow[];
		return rows.map((row) => this.toObservation(row));
	}

	markReflected(ids: string[]): void {
		if (ids.length === 0) {
			return;
		}


		const placeholders = ids.map(() => "?").join(",");

		database.prepare(`
			UPDATE behavior_observations
			SET reflected = 1
			WHERE id IN (${placeholders})
		`).run(...ids);
	}

	private toObservation(row: BehaviorObservationRow): BehaviorObservation {
		return {
			id: row.id,
			playerName: row.player_name,
			situation: row.situation,
			playerAction: row.player_action,
			context: JSON.parse(row.context_json) as Record<string, unknown>,
			importance: row.importance,
			reflected: row.reflected === 1,
			createdAt: row.created_at,
		};
	}
}

