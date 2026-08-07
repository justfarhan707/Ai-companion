import type { ReactionIntent } from "../reactions/ReactionIntent.js";

export class ChatterCooldownStore {
	private readonly lastSpokenAt = new Map<string, number>();

	canSpeak(playerName: string, intent: ReactionIntent): boolean {
    		const key = `${playerName}:${intent.reason}`;
    		const now = Date.now();
    		const lastSpokenAt = this.lastSpokenAt.get(key) ?? 0;
    		const cooldownMs = this.cooldownFor(intent);

    		if (now - lastSpokenAt < cooldownMs) {
    			return false;
    		}

    		this.lastSpokenAt.set(key, now);
    		return true;
    	}

    	private cooldownFor(intent: ReactionIntent): number {
    		switch (intent.urgency) {
    			case "critical":
    				return 10_000;
    			case "high":
    				return 30_000;
    			case "medium":
    				return 60_000;
    			case "low":
    				return 120_000;
    		}
    	}
    }