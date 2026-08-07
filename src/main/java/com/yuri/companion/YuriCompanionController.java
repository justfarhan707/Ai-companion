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
}
