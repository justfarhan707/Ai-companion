package com.yuri.actions;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.minecraft.server.MinecraftServer;
import net.minecraft.text.Text;

public class YuriActionExecutor {
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
}
