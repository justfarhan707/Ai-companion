import express from "express";
import cors from "cors";
import { MockLlmProvider } from "./ai/MockLlmProvider.js";
import type { ChatRequest } from "./types/chat.js";

const app = express();
const port = 3001;
const llmProvider = new MockLlmProvider();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "yuri-backend",
    });
});

app.post("/chat", async (req, res) => {
    const request = req.body as Partial<ChatRequest>;

    if (!request.message || !request.player || !request.nearby) {
        res.status(400).json({
            error: "message, player, and nearby are required",
        });
        return;
    }

    const response = await llmProvider.chat({
        message: String(request.message).trim(),
        player: {
            name: String(request.player.name),
            world: String(request.player.world),
            x: Number(request.player.x),
            y: Number(request.player.y),
            z: Number(request.player.z),
        },
        nearby: {
            entities: Array.isArray(request.nearby.entities)
                ? request.nearby.entities.map(String)
                : [],
            blocks: Array.isArray(request.nearby.blocks)
                ? request.nearby.blocks.map((block) => ({
                    name: String(block.name),
                    count: Number(block.count),
                }))
                : [],
        },
    });

    res.json(response);
});

app.listen(port, () => {
    console.log(`Yuri backend listening on http://localhost:${port}`);
});