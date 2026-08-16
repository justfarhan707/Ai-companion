const TAG_RULES: Array<{
	tags: string[];
	words: string[];
}> = [
	{
		tags: ["cave", "underground", "exploration", "danger"],
		words: ["cave", "caves", "underground", "mine", "mining", "deep"],
	},
	{
		tags: ["lava", "danger", "death"],
		words: ["lava", "burn", "burning", "fell", "fire"],
	},
	{
		tags: ["danger", "hostile_mobs", "near_death", "death"],
		words: ["scared", "danger", "zombie", "skeleton", "creeper", "monster", "mobs", "died", "death"],
	},
	{
		tags: ["discovery", "rare_block", "mining"],
		words: ["diamond", "diamonds", "emerald", "ancient debris", "ore", "found"],
	},
	{
		tags: ["home"],
		words: ["home", "house", "base", "castle"],
	},
    {
    	tags: ["preference", "personal_fact"],
    	words: ["favorite", "like", "love", "hate", "prefer", "call me", "remember"],
    },
    {
    	tags: ["place", "home"],
    	words: ["base", "home", "house", "castle"],
    },
];

export class MessageMemoryTagger {
	inferTags(message: string): string[] {
		const lowerMessage = message.toLowerCase();
		const tags = new Set<string>();

		for (const rule of TAG_RULES) {
			if (rule.words.some((word) => lowerMessage.includes(word))) {
				for (const tag of rule.tags) {
					tags.add(tag);
				}
			}
		}

		return [...tags];
	}
}
