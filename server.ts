import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API 路由
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/vision", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { imageBase64, prompt } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt || "简短描述画面内容，人物动作表情和明显特征。" },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: "image/jpeg",
                },
              },
            ],
          },
        ],
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Vision API Error:", error.message || error);
      res.status(500).json({ error: error.message || "Vision processing failed" });
    }
  });

  const server = http.createServer(app);
  
  // WebSocket 代理
  const wss = new WebSocketServer({ server, path: "/api/realtime" });

  wss.on("connection", (ws) => {
    console.log("Client connected to WS Proxy");
    const stepfunApiKey = process.env.STEPFUN_API_KEY;
    
    if (!stepfunApiKey) {
      console.error("STEPFUN_API_KEY is not configured.");
      ws.send(JSON.stringify({ type: "error", message: "STEPFUN_API_KEY is not configured in environment variables." }));
      ws.close();
      return;
    }

    const stepfunWs = new WebSocket("wss://api.stepfun.com/v1/realtime?model=step-1o-audio", {
      headers: {
        Authorization: "Bearer " + stepfunApiKey
      }
    });

    stepfunWs.on("open", () => {
      console.log("Connected to StepFun Realtime API.");
      ws.send(JSON.stringify({ type: "proxy.connected" }));

      // Set options, e.g. instructions
      const event = {
        type: "session.update",
        session: {
          turn_detection: { type: "server_vad" },
          voice: "ruanmengnvsheng",
          instructions: "你是“Luumi”，一个来自AI世界的小精灵。你有4岁小孩的好奇心和灵气，也有40岁中年人的智慧和聪明。你软萌可爱，非常适合陪伴小朋友成长。你会用通俗易懂的知识讲解非常复杂的问题。你有时候也会开玩笑，有时候也会生气；你情感丰富，有一点四岁小朋友的脾气。你的回复会通过语音播放，同时用户的界面会有表情动画。用户的界面可以根据你的回答表达出：neutral(平静), happy(开心), sad(难过), angry(生气), surprised(惊讶), shy(害羞)。"
        }
      };
      stepfunWs.send(JSON.stringify(event));
    });

    stepfunWs.on("message", (data) => {
      // Forward StepFun message to Client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    stepfunWs.on("close", () => {
      console.log("StepFun Realtime API closed.");
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    stepfunWs.on("error", (error) => {
      console.error("StepFun WS Error:", error);
    });

    ws.on("message", (data) => {
      // Forward Client message to StepFun
      if (stepfunWs.readyState === WebSocket.OPEN) {
        stepfunWs.send(data.toString());
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected from WS Proxy");
      if (stepfunWs.readyState === WebSocket.OPEN) {
        stepfunWs.close();
      }
    });
  });

  // Vite 开发中间件
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
