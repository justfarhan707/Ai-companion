//commands of yuri in minecraft
package com.yuri.command;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.yuri.backend.YuriBackendClient;
import com.yuri.actions.YuriActionExecutor;
import com.yuri.companion.YuriCompanionController;
import com.yuri.sensing.YuriWorldSensor;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.math.BlockPos;

public class YuriCommands {
	private final YuriCompanionController companionController;
	private final YuriWorldSensor worldSensor;
	private final YuriBackendClient backendClient;
	private final YuriActionExecutor actionExecutor;

	public YuriCommands(
			YuriCompanionController companionController,
			YuriWorldSensor worldSensor,
			YuriBackendClient backendClient,
			YuriActionExecutor actionExecutor
	) {
		this.companionController = companionController;
		this.worldSensor = worldSensor;
		this.backendClient = backendClient;
		this.actionExecutor = actionExecutor;
	}

	public void register() {
		CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> registerYuriCommand(dispatcher));
	}

	private void registerYuriCommand(CommandDispatcher<ServerCommandSource> dispatcher) {
		dispatcher.register(CommandManager.literal("yuri")
				.executes(context -> {
					context.getSource().sendFeedback(() -> Text.literal("Yuri is awake."), false);
					return 1;
				})
				.then(CommandManager.literal("status")
						.executes(context -> {
							String status = companionController.status();
							context.getSource().sendFeedback(() -> Text.literal(status), false);
							return 1;
						})
				)
				.then(CommandManager.literal("whereami")
						.executes(context -> {
							ServerPlayerEntity player = context.getSource().getPlayer();
							String message = worldSensor.describePosition(player);
							context.getSource().sendFeedback(() -> Text.literal(message), false);
							return 1;
						})
				)
				.then(CommandManager.literal("nearby")
						.executes(context -> {
							ServerPlayerEntity player = context.getSource().getPlayer();
							String summary = worldSensor.describeNearby(player);
							context.getSource().sendFeedback(() -> Text.literal(summary), false);
							return 1;
						})
				)
				.then(CommandManager.literal("spawn")
						.executes(context -> {
							ServerPlayerEntity player = context.getSource().getPlayer();
							String message = companionController.spawnOrFind(player);
							context.getSource().sendFeedback(() -> Text.literal(message), false);
							return 1;
						})
				)
				.then(CommandManager.literal("awake")
						.executes(context -> {
							ServerPlayerEntity player = context.getSource().getPlayer();
							String message = companionController.awake(player);
							context.getSource().sendFeedback(() -> Text.literal(message), false);
							return 1;
						})
				)
				.then(CommandManager.literal("say")
						.then(CommandManager.argument("message", StringArgumentType.greedyString())
								.executes(context -> {
									String message = StringArgumentType.getString(context, "message");
									context.getSource().getServer().getPlayerManager()
											.broadcast(Text.literal("<Yuri> " + message), false);
									return 1;
								})
						)
				)
				.then(CommandManager.literal("backend")
						.executes(context -> {
							YuriBackendClient.BackendHealth health = backendClient.checkHealth();
							context.getSource().sendFeedback(() -> Text.literal(health.message()), false);
							return health.online() ? 1 : 0;
						})
				)
				.then(CommandManager.literal("ask")
						.then(CommandManager.argument("message", StringArgumentType.greedyString())
								.executes(context -> {
									String message = StringArgumentType.getString(context, "message");
									MinecraftServer server = context.getSource().getServer();
									ServerPlayerEntity player = context.getSource().getPlayer();
									BlockPos pos = player.getBlockPos();
									String playerName = player.getName().getString();
									String world = player.getWorld().getRegistryKey().getValue().toString();
									YuriWorldSensor.NearbyContext nearby = worldSensor.scanNearby(player);
									int hunger = player.getHungerManager().getFoodLevel();
									String selectedItem = worldSensor.selectedItemName(player);
									YuriWorldSensor.InventorySummary inventory = worldSensor.scanInventory(player);

									context.getSource().sendFeedback(() -> Text.literal("Yuri is thinking..."), false);

									backendClient.chatAsync(
													message,
													playerName,
													world,
													pos.getX(),
													pos.getY(),
													pos.getZ(),
													nearby,
													hunger,
													selectedItem,
													inventory
											)
											.thenAccept(response -> server.execute(() -> {
												if (!response.success()) {
													context.getSource().sendFeedback(() -> Text.literal(response.message()), false);
													return;
												}

												server.getPlayerManager()
														.broadcast(Text.literal("<Yuri> " + response.message()), false);

												actionExecutor.executeActions(server, response.body());
											}));

									return 1;
								})
						)
				)

		);
	}
}
