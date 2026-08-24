package com.yuri.actions;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.server.MinecraftServer;
import net.minecraft.text.Text;
import com.yuri.companion.YuriCompanionController;

public class YuriActionExecutor {

    private final YuriCompanionController companionController;

    public YuriActionExecutor(YuriCompanionController companionController) {
        this.companionController = companionController;
    }

    public void executeActions(MinecraftServer server, String responseBody) {
        JsonObject response = JsonParser.parseString(responseBody).getAsJsonObject();

        if (!response.has("actions") || !response.get("actions").isJsonArray()) {
            return;
        }

        JsonArray actions = response.getAsJsonArray("actions");

        for (JsonElement element : actions) {
            if (!element.isJsonObject()) {
                continue;
            }

            JsonObject action = element.getAsJsonObject();
            String type = action.has("type") ? action.get("type").getAsString() : "";

            if ("say".equals(type)) {
                executeSay(server, action);
            }

            if ("hunt_entity".equals(type)) {
                executeHuntEntity(server, action);
            }
            if ("stop_action".equals(type)) {
                executeStopAction(server);
            }
            if ("go_to_position".equals(type)) {
                executeGoToPosition(server, action);
            }
        }
    }

    private void executeSay(MinecraftServer server, JsonObject action) {
        if (!action.has("text")) {
            return;
        }

        String text = action.get("text").getAsString().trim();

        if (text.isBlank()) {
            return;
        }

        server.getPlayerManager()
                .broadcast(Text.literal("<Yuri> " + text), false);
    }

    private void executeHuntEntity(MinecraftServer server, JsonObject action) {
        if (!action.has("targetName")) {
            return;
        }

        String targetName = action.get("targetName").getAsString().trim();

        if (targetName.isBlank()) {
            return;
        }

        String message = companionController.huntNearest(server, targetName);

        server.getPlayerManager()
                .broadcast(Text.literal("<Yuri> " + message), false);
    }

    private void executeStopAction(MinecraftServer server) {
        String message = companionController.stopCurrentAction(server);

        server.getPlayerManager()
                .broadcast(Text.literal("<Yuri> " + message), false);
    }

    private void executeGoToPosition(MinecraftServer server, JsonObject action) {
        if (!action.has("placeName") || !action.has("world")
                || !action.has("x") || !action.has("y") || !action.has("z")) {
            return;
        }

        String placeName = action.get("placeName").getAsString();
        String world = action.get("world").getAsString();
        int x = action.get("x").getAsInt();
        int y = action.get("y").getAsInt();
        int z = action.get("z").getAsInt();

        String message = companionController.goToPosition(server, placeName, world, x, y, z);

        server.getPlayerManager()
                .broadcast(Text.literal("<Yuri> " + message), false);
    }
}
