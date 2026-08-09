// using this to contsantly feed yuri whats nearby the player
package com.yuri.sensing;

import net.minecraft.block.BlockState;
import net.minecraft.entity.Entity;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.world.World;
import net.minecraft.component.DataComponentTypes;
import net.minecraft.item.ItemStack;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class YuriWorldSensor {
	public record NearbyContext(
			List<String> entities,
			List<NearbyEntity> entityDetails,
			List<NearbyBlock> blocks
	) {
	}

	public record NearbyEntity(String name, double distance) {
	}

	public record NearbyBlock(String name, int count) {
	}

	public record InventorySummary(List<InventoryItem> foodItems, int totalFoodCount) {
	}

	public record InventoryItem(String name, int count) {
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

		List<NearbyEntity> entityDetails = nearbyEntities.stream()
				.sorted(Comparator.comparingDouble(entity -> entity.squaredDistanceTo(player)))
				.limit(8)
				.map(entity -> new NearbyEntity(
						entity.getName().getString(),
						Math.sqrt(entity.squaredDistanceTo(player))
				))
				.toList();

		List<String> entityNames = entityDetails.stream()
				.map(NearbyEntity::name)
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

		return new NearbyContext(entityNames, entityDetails, blocks);
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


	//inventory function
	public InventorySummary scanInventory(ServerPlayerEntity player) {
		Map<String, Integer> foodCounts = new HashMap<>();

		for (int slot = 0; slot < player.getInventory().size(); slot++) {
			ItemStack stack = player.getInventory().getStack(slot);

			if (stack.isEmpty() || stack.get(DataComponentTypes.FOOD) == null) {
				continue;
			}

			String itemName = stack.getName().getString();
			foodCounts.put(itemName, foodCounts.getOrDefault(itemName, 0) + stack.getCount());
		}

		List<InventoryItem> foodItems = foodCounts.entrySet().stream()
				.sorted(Map.Entry.comparingByKey())
				.map(entry -> new InventoryItem(entry.getKey(), entry.getValue()))
				.toList();

		int totalFoodCount = foodItems.stream()
				.mapToInt(InventoryItem::count)
				.sum();

		return new InventorySummary(foodItems, totalFoodCount);
	}

	public String selectedItemName(ServerPlayerEntity player) {
		ItemStack stack = player.getMainHandStack();

		if (stack.isEmpty()) {
			return "empty";
		}

		return stack.getName().getString();
	}

}
