//this file talks to node js backend
package com.yuri.backend;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.yuri.sensing.YuriWorldSensor;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.net.http.HttpTimeoutException;
import java.util.stream.Collectors;

public class YuriBackendClient {
    private static final String HEALTH_URL = "http://localhost:3001/health";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    public CompletableFuture<BackendChatResponse> chatAsync(
            String message,
            String playerName,
            String world,
            int x,
            int y,
            int z,
            YuriWorldSensor.NearbyContext nearby,
            int hunger,
            String selectedItem,
            YuriWorldSensor.InventorySummary inventory
    ) {
        return CompletableFuture.supplyAsync(() -> chat(
                message,
                playerName,
                world,
                x,
                y,
                z,
                nearby,
                hunger,
                selectedItem,
                inventory
        ));
    }

    public BackendHealth checkHealth() {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(HEALTH_URL))
                .timeout(Duration.ofSeconds(3))
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return new BackendHealth(true, "Yuri backend is online.");
            }

            return new BackendHealth(false, "Yuri backend returned HTTP " + response.statusCode() + ".");
        } catch (IOException exception) {
            return new BackendHealth(false, "Yuri backend is offline: " + exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new BackendHealth(false, "Yuri backend check was interrupted.");
        }
    }

    public BackendChatResponse chat(
            String message,
            String playerName,
            String world,
            int x,
            int y,
            int z,
            YuriWorldSensor.NearbyContext nearby,
            int hunger,
            String selectedItem,
            YuriWorldSensor.InventorySummary inventory
    ) {
        String json = "{"
                + "\"message\":\"" + escapeJson(message) + "\","
                + "\"player\":{"
                + "\"name\":\"" + escapeJson(playerName) + "\","
                + "\"world\":\"" + escapeJson(world) + "\","
                + "\"x\":" + x + ","
                + "\"y\":" + y + ","
                + "\"z\":" + z
                + "},"
                + "\"nearby\":{"
                + "\"entities\":" + toJsonStringArray(nearby.entities()) + ","
                + "\"entityDetails\":" + toJsonEntityDetailsArray(nearby.entityDetails()) + ","
                + "\"blocks\":" + toJsonBlocksArray(nearby.blocks())
                + "},"
                + "\"hunger\":" + hunger + ","
                + "\"selectedItem\":\"" + escapeJson(selectedItem) + "\","
                + "\"inventory\":" + toJsonInventory(inventory)
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:3001/chat"))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new BackendChatResponse(false, "Yuri backend returned HTTP " + response.statusCode() + ".", "");
            }

            String reply = extractReply(response.body());

            if (reply.isBlank()) {
                return new BackendChatResponse(false, "Yuri backend returned an empty reply.", response.body());
            }

            return new BackendChatResponse(true, reply, response.body());
        } catch (HttpTimeoutException exception) {
            return new BackendChatResponse(false, "Yuri took too long to think. Try again in a moment.", "");
        } catch (IOException exception) {
            return new BackendChatResponse(false, "Yuri backend is offline: " + exception.getMessage(), "");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new BackendChatResponse(false, "Yuri backend chat was interrupted.", "");
        }
    }

    private static String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private static String toJsonStringArray(List<String> values) {
        return values.stream()
                .map(value -> "\"" + escapeJson(value) + "\"")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String toJsonBlocksArray(List<YuriWorldSensor.NearbyBlock> blocks) {
        return blocks.stream()
                .map(block -> "{"
                        + "\"name\":\"" + escapeJson(block.name()) + "\","
                        + "\"count\":" + block.count()
                        + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String extractReply(String json) {
        JsonObject response = JsonParser.parseString(json).getAsJsonObject();

        if (!response.has("reply")) {
            return "";
        }

        return response.get("reply").getAsString();
    }

    public record BackendChatResponse(boolean success, String message, String body) {
    }

    public record BackendHealth(boolean online, String message) {
    }

    public record BackendEventResponse(boolean success, String body) {
    }

//starts a new thread so game doesnt stuttur in java terms its a promise it accepts params
    public CompletableFuture<BackendEventResponse> sendPlayerStateUpdatedAsync(
            String playerName,
            String world,
            int x,
            int y,
            int z,
            YuriWorldSensor.NearbyContext nearby,
            float health,
            int hunger,
            String selectedItem,
            YuriWorldSensor.InventorySummary inventory,
            long gameTime

    ) {
        //after getting patrams run this funttion on diff thread
        return CompletableFuture.supplyAsync(() -> sendPlayerStateUpdated(
                playerName,
                world,
                x,
                y,
                z,
                nearby,
                health,
                hunger,
                selectedItem,
                inventory,
                gameTime
        ));
    }

// and this is the function which is supossed to run on diff thread
    private BackendEventResponse sendPlayerStateUpdated(
            String playerName,
            String world,
            int x,
            int y,
            int z,
            YuriWorldSensor.NearbyContext nearby,
            float health,
            int hunger,
            String selectedItem,
            YuriWorldSensor.InventorySummary inventory,
            long gameTime
    ) {
        String json = "{"
                + "\"type\":\"PlayerStateUpdated\","
                + "\"player\":{"
                + "\"name\":\"" + escapeJson(playerName) + "\","
                + "\"world\":\"" + escapeJson(world) + "\","
                + "\"x\":" + x + ","
                + "\"y\":" + y + ","
                + "\"z\":" + z
                + "},"
                + "\"nearby\":{"
                + "\"entities\":" + toJsonStringArray(nearby.entities()) + ","
                + "\"entityDetails\":" + toJsonEntityDetailsArray(nearby.entityDetails()) + ","
                + "\"blocks\":" + toJsonBlocksArray(nearby.blocks())
                + "},"
                + "\"health\":" + health + ","
                + "\"hunger\":" + hunger + ","
                + "\"selectedItem\":\"" + escapeJson(selectedItem) + "\","
                + "\"inventory\":" + toJsonInventory(inventory) + ","
                + "\"gameTime\":" + gameTime
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:3001/events"))
                .timeout(Duration.ofSeconds(3))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new BackendEventResponse(false, "");
            }

            return new BackendEventResponse(true, response.body());
        } catch (IOException exception) {
            return new BackendEventResponse(false, "");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new BackendEventResponse(false, "");
        }
    }

    //yuriActionComplete

    public CompletableFuture<BackendEventResponse> sendYuriActionCompletedAsync(
            String playerName,
            String world,
            int x,
            int y,
            int z,
            String actionType,
            String targetName,
            String result
    ) {
        return CompletableFuture.supplyAsync(() -> sendYuriActionCompleted(
                playerName,
                world,
                x,
                y,
                z,
                actionType,
                targetName,
                result
        ));
    }

    //privatemethod
    private BackendEventResponse sendYuriActionCompleted(
            String playerName,
            String world,
            int x,
            int y,
            int z,
            String actionType,
            String targetName,
            String result
    ) {
        String json = "{"
                + "\"type\":\"YuriActionCompleted\","
                + "\"player\":{"
                + "\"name\":\"" + escapeJson(playerName) + "\","
                + "\"world\":\"" + escapeJson(world) + "\","
                + "\"x\":" + x + ","
                + "\"y\":" + y + ","
                + "\"z\":" + z
                + "},"
                + "\"action\":{"
                + "\"type\":\"" + escapeJson(actionType) + "\","
                + "\"targetName\":\"" + escapeJson(targetName) + "\","
                + "\"result\":\"" + escapeJson(result) + "\""
                + "}"
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:3001/events"))
                .timeout(Duration.ofSeconds(3))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new BackendEventResponse(false, "");
            }

            return new BackendEventResponse(true, response.body());
        } catch (IOException exception) {
            return new BackendEventResponse(false, "");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new BackendEventResponse(false, "");
        }
    }


    private static String toJsonEntityDetailsArray(List<YuriWorldSensor.NearbyEntity> entities) {
        return entities.stream()
                .map(entity -> "{"
                        + "\"name\":\"" + escapeJson(entity.name()) + "\","
                        + "\"distance\":" + String.format(java.util.Locale.US, "%.2f", entity.distance())
                        + "}")
                .collect(Collectors.joining(",", "[", "]"));
    }

    private static String toJsonInventory(YuriWorldSensor.InventorySummary inventory) {
        return "{"
                + "\"foodItems\":" + inventory.foodItems().stream()
                .map(item -> "{"
                        + "\"name\":\"" + escapeJson(item.name()) + "\","
                        + "\"count\":" + item.count()
                        + "}")
                .collect(Collectors.joining(",", "[", "]"))
                + ","
                + "\"totalFoodCount\":" + inventory.totalFoodCount()
                + "}";
    }

}
