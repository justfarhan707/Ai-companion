// using this to contsantly feed yuri whats nearby the player
package com.yuri.sensing;

import net.minecraft.block.BlockState;
import net.minecraft.entity.Entity;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.world.World;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class YuriWorldSensor {
	public record NearbyContext(List<String> entities, List<NearbyBlock> blocks) {
	}

	public record NearbyBlock(String name, int count) {
	}

	public String describePosition(ServerPlayerEntity player) {
		BlockPos pos = player.getBlockPos();
		String world = player.getWorld().getRegistryKey().getValue().toString();

		return "You are at x=" + pos.getX()
				+ ", y=" + pos.getY()
				+ ", z=" + pos.getZ()
				+ " in " + world;
	}

	public NearbyContext scanNearby(ServerPlayerEntity player) {
		World world = player.getWorld();
		BlockPos playerPos = player.getBlockPos();

		List<Entity> nearbyEntities = world.getOtherEntities(
				player,
				new Box(player.getX() - 8, player.getY() - 4, player.getZ() - 8,
						player.getX() + 8, player.getY() + 4, player.getZ() + 8)
		);

		List<String> entityNames = nearbyEntities.stream()
				.limit(8)
				.map(entity -> entity.getName().getString())
				.toList();

		Map<String, Integer> blockCounts = new HashMap<>();

		for (BlockPos pos : BlockPos.iterate(
				playerPos.add(-3, -1, -3),
				playerPos.add(3, 2, 3)
		)) {
			BlockState state = world.getBlockState(pos);
			String blockName = state.getBlock().getName().getString();
			blockCounts.put(blockName, blockCounts.getOrDefault(blockName, 0) + 1);
		}

		List<NearbyBlock> blocks = blockCounts.entrySet().stream()
				.sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
				.limit(8)
				.map(entry -> new NearbyBlock(entry.getKey(), entry.getValue()))
				.toList();

		return new NearbyContext(entityNames, blocks);
	}

	public String describeNearby(ServerPlayerEntity player) {
		NearbyContext nearby = scanNearby(player);

		StringBuilder message = new StringBuilder();
		message.append("Nearby: ");
		message.append(nearby.entities().size()).append(" entities. ");

		if (nearby.entities().isEmpty()) {
			message.append("No nearby entities. ");
		} else {
			message.append("Entities: ");
			message.append(String.join(", ", nearby.entities()));
			message.append(". ");
		}

		message.append("Common blocks: ");
		for (NearbyBlock block : nearby.blocks()) {
			message.append(block.name())
						.append(" x")
					.append(block.count())
					.append("; ");
		}

		return message.toString();
	}
}
