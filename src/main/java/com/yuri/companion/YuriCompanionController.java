// to control the cat that is being spwaned
package com.yuri.companion;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.passive.CatEntity;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;

import java.util.List;
import java.util.UUID;

public class YuriCompanionController {
	private UUID yuriUuid;
	private UUID yuriOwnerUuid;
	private UUID huntTargetUuid;
	private String huntTargetName;
	private boolean yuriActive;

	public void registerEvents() {
		ServerTickEvents.END_SERVER_TICK.register(this::tickYuriFollower);
		ServerLifecycleEvents.SERVER_STOPPING.register(this::putYuriToSleep);
	}

	public String spawnOrFind(ServerPlayerEntity player) {
		CatEntity existingYuri = findExistingYuri(player);

		if (existingYuri != null) {
			trackYuri(player, existingYuri);
			yuriActive = false;
			existingYuri.setInvulnerable(true);
			existingYuri.setSitting(true);
			return "Yuri is already here. Use /yuri awake when you want him to follow.";
		}

		CatEntity yuri = EntityType.CAT.create(player.getWorld());

		if (yuri == null) {
			return "Yuri failed to wake up.";
		}

		BlockPos spawnPos = player.getBlockPos().add(1, 0, 1);

		yuri.refreshPositionAndAngles(
				spawnPos.getX() + 0.5,
				spawnPos.getY(),
				spawnPos.getZ() + 0.5,
				player.getYaw(),
				0
		);

		yuri.setCustomName(Text.literal("Yuri"));
		yuri.setCustomNameVisible(true);
		yuri.setAiDisabled(false);
		yuri.setInvulnerable(true);
		yuri.setOwner(player);
		yuri.setSitting(true);

		player.getWorld().spawnEntity(yuri);
		trackYuri(player, yuri);
		yuriActive = false;

		return "Yuri appeared beside you and is resting. Use /yuri awake when you're ready.";
	}

	public String awake(ServerPlayerEntity player) {
		CatEntity yuri = findTrackedOrExistingYuri(player);

		if (yuri == null) {
			return "Yuri is not here yet. Use /yuri spawn first.";
		}

		trackYuri(player, yuri);
		yuri.setOwner(player);
		yuri.setInvulnerable(true);
		yuri.setSitting(false);
		yuriActive = true;

		return "Yuri woke up and will follow you.";
	}

	public String status() {
		String activity = yuriActive ? "awake" : "resting";
		String presence = yuriUuid == null ? "not_tracked" : "tracked";
		return "Yuri status: phase=FRIENDLY, backend=offline, body=" + presence + ", activity=" + activity;
	}

	private void tickYuriFollower(MinecraftServer server) {
		if (!yuriActive || yuriUuid == null || yuriOwnerUuid == null) {
			return;
		}

		ServerPlayerEntity owner = server.getPlayerManager().getPlayer(yuriOwnerUuid);

		if (owner == null) {
			return;
		}

		ServerWorld world = owner.getServerWorld();
		Entity entity = world.getEntity(yuriUuid);

		if (!(entity instanceof CatEntity yuri) || !yuri.isAlive()) {
			return;
		}

		if (huntTargetUuid != null) {
			Entity target = world.getEntity(huntTargetUuid);

			if (target == null || !target.isAlive()) {
				huntTargetUuid = null;
				huntTargetName = null;
				return;
			}

			double targetDistanceSq = yuri.squaredDistanceTo(target);

			if (targetDistanceSq > 2.25) {
				yuri.getNavigation().startMovingTo(target, 1.35);
				return;
			}

			server.getPlayerManager()
					.broadcast(Text.literal("<Yuri> I reached the " + huntTargetName + "."), false);

			huntTargetUuid = null;
			huntTargetName = null;
			return;
		}

		double distanceSq = yuri.squaredDistanceTo(owner);

		yuri.setSitting(false);

		if (distanceSq > 400) {
			yuri.requestTeleport(owner.getX() + 1, owner.getY(), owner.getZ() + 1);
			return;
		}

		if (distanceSq > 9) {
			yuri.getNavigation().startMovingTo(owner, 1.25);
		}
	}

	private void putYuriToSleep(MinecraftServer server) {
		yuriActive = false;
		huntTargetUuid = null;
		huntTargetName = null;

		if (yuriUuid == null) {
			return;
		}

		for (ServerWorld world : server.getWorlds()) {
			Entity entity = world.getEntity(yuriUuid);

			if (entity instanceof CatEntity yuri && yuri.isAlive()) {
				yuri.setSitting(true);
				return;
			}
		}
	}

	private CatEntity findTrackedOrExistingYuri(ServerPlayerEntity player) {
		if (yuriUuid != null) {
			Entity trackedEntity = player.getServerWorld().getEntity(yuriUuid);

			if (trackedEntity instanceof CatEntity yuri && isYuriCat(yuri)) {
				return yuri;
			}
		}

		return findExistingYuri(player);
	}

	private CatEntity findExistingYuri(ServerPlayerEntity player) {
		Box searchArea = new Box(
				player.getX() - 128,
				player.getY() - 64,
				player.getZ() - 128,
				player.getX() + 128,
				player.getY() + 64,
				player.getZ() + 128
		);

		List<CatEntity> cats = player.getWorld().getEntitiesByClass(CatEntity.class, searchArea, YuriCompanionController::isYuriCat);

		if (cats.isEmpty()) {
			return null;
		}

		return cats.get(0);
	}

	private static boolean isYuriCat(CatEntity cat) {
		return cat.isAlive()
				&& cat.hasCustomName()
				&& cat.getCustomName() != null
				&& "Yuri".equals(cat.getCustomName().getString());
	}

	private void trackYuri(ServerPlayerEntity owner, CatEntity yuri) {
		yuriUuid = yuri.getUuid();
		yuriOwnerUuid = owner.getUuid();
	}

	public String huntNearest(MinecraftServer server, String targetName) {
		if (yuriUuid == null || yuriOwnerUuid == null) {
			return "I need to be awake before I can hunt.";
		}

		ServerPlayerEntity owner = server.getPlayerManager().getPlayer(yuriOwnerUuid);

		if (owner == null) {
			return "I can't find you right now.";
		}

		CatEntity yuri = findTrackedOrExistingYuri(owner);

		if (yuri == null) {
			return "I can't find my body right now.";
		}

		Entity target = findNearestNamedEntity(owner, targetName);

		if (target == null) {
			return "I can't see a " + targetName + " nearby.";
		}

		yuriActive = true;
		yuri.setSitting(false);
		huntTargetUuid = target.getUuid();
		huntTargetName = targetName;

		return "I'm going after the " + targetName + ".";
	}

	private Entity findNearestNamedEntity(ServerPlayerEntity owner, String targetName) {
		Box searchArea = new Box(
				owner.getX() - 16,
				owner.getY() - 8,
				owner.getZ() - 16,
				owner.getX() + 16,
				owner.getY() + 8,
				owner.getZ() + 16
		);

		List<Entity> matches = owner.getWorld().getOtherEntities(
				owner,
				searchArea,
				entity -> entity.isAlive()
						&& entity.getName().getString().equalsIgnoreCase(targetName)
		);

		if (matches.isEmpty()) {
			return null;
		}

		return matches.stream()
				.min((a, b) -> Double.compare(a.squaredDistanceTo(owner), b.squaredDistanceTo(owner)))
				.orElse(null);
	}

}
