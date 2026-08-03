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
            YuriWorldSensor.NearbyContext nearby
    ) {
        return CompletableFuture.supplyAsync(() -> chat(message, playerName, world, x, y, z, nearby));
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
            YuriWorldSensor.NearbyContext nearby
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
                + "\"blocks\":" + toJsonBlocksArray(nearby.blocks())
                + "}"
                + "}";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:3001/chat"))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return new BackendChatResponse(false, "Yuri backend returned HTTP " + response.statusCode() + ".");
            }

            String reply = extractReply(response.body());

            if (reply.isBlank()) {
                return new BackendChatResponse(false, "Yuri backend returned an empty reply.");
            }

            return new BackendChatResponse(true, reply);
        } catch (IOException exception) {
            return new BackendChatResponse(false, "Yuri backend is offline: " + exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new BackendChatResponse(false, "Yuri backend chat was interrupted.");
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

    public record BackendChatResponse(boolean success, String message) {
    }

    public record BackendHealth(boolean online, String message) {
    }
}
