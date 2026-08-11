import type { ProposedAction } from "./ProposedAction.js";

export class ProposalStore {
	private readonly proposals = new Map<string, ProposedAction>();

	create(input: {
		playerName: string;
		type: ProposedAction["type"];
		targetName: string;
		reason: string;
		ttlMs?: number;
	}): ProposedAction {
		const now = Date.now();
		const proposal: ProposedAction = {
			id: crypto.randomUUID(),
			playerName: input.playerName,
			type: input.type,
			targetName: input.targetName,
			reason: input.reason,
			createdAt: new Date(now).toISOString(),
			expiresAt: new Date(now + (input.ttlMs ?? 30_000)).toISOString(),
		};

		this.proposals.set(input.playerName, proposal);
		return proposal;
	}

	get(playerName: string): ProposedAction | undefined {
		const proposal = this.proposals.get(playerName);

		if (!proposal) {
			return undefined;
		}

		if (Date.parse(proposal.expiresAt) <= Date.now()) {
			this.proposals.delete(playerName);
			return undefined;
		}

		return proposal;
	}

	consume(playerName: string): ProposedAction | undefined {
		const proposal = this.get(playerName);

		if (!proposal) {
			return undefined;
		}

		this.proposals.delete(playerName);
		return proposal;
	}

	clear(playerName: string): void {
		this.proposals.delete(playerName);
	}
}
