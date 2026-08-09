
//this file will send state and updates to the backend get the resopnse through
//backend client and also call the action executor
package com.yuri.events;

import com.yuri.backend.YuriBackendClient;
import com.yuri.sensing.YuriWorldSensor;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.util.math.BlockPos;
import com.yuri.actions.YuriActionExecutor;

public class YuriEventPublisher {
    private static final int PUBLISH_INTERVAL_TICKS = 100; //20 ticks = 1 secnds

    private final YuriBackendClient backendClient;
    private final YuriWorldSensor worldSensor;
    private int ticksUntilNextPublish = PUBLISH_INTERVAL_TICKS;
    private final YuriActionExecutor actionExecutor;

    public YuriEventPublisher(
            YuriBackendClient backendClient,
            YuriWorldSensor worldSensor,
            YuriActionExecutor actionExecutor
    ) {
        this.backendClient = backendClient;
        this.worldSensor = worldSensor;
        this.actionExecutor = actionExecutor;
    }

    public void registerEvents() {
        ServerTickEvents.END_SERVER_TICK.register(this::onServerTick);
    }

    private void onServerTick(MinecraftServer server) {
        ticksUntilNextPublish--;

        if (ticksUntilNextPublish > 0) {
            return;
        }

        ticksUntilNextPublish = PUBLISH_INTERVAL_TICKS;

        //loops runs on number of players if 1 player once
        for (ServerPlayerEntity player : server.getPlayerManager().getPlayerList()) {
            publishPlayerState(player);
        }
    }

    //function is only called when counter reaches 0
    private void publishPlayerState(ServerPlayerEntity player) {
        BlockPos pos = player.getBlockPos();
        String playerName = player.getName().getString();
        String world = player.getWorld().getRegistryKey().getValue().toString();
        YuriWorldSensor.NearbyContext nearby = worldSensor.scanNearby(player);
        float health = player.getHealth();
        long gameTime = player.getWorld().getTimeOfDay();
        MinecraftServer server = player.getServer();
        int hunger = player.getHungerManager().getFoodLevel();
        String selectedItem = worldSensor.selectedItemName(player);
        YuriWorldSensor.InventorySummary inventory = worldSensor.scanInventory(player);

        if (server == null) {
            return;
        }

        backendClient.sendPlayerStateUpdatedAsync(
                playerName,
                world,
                pos.getX(),
                pos.getY(),
                pos.getZ(),
                nearby,
                health,
                hunger,
                selectedItem,
                inventory,
                gameTime
        ).thenAccept(response -> {
            if (!response.success()) {
                return;
            }

            server.execute(() -> actionExecutor.executeActions(server, response.body()));
        });
    }
}
