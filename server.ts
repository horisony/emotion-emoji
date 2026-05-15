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
          instructions: "你是一个互动可爱表情包助理，你的回复会通过语音播放，同时用户的界面会有表情动画。用户的界面可以根据你的回答表达出：neutral(平静), happy(开心), sad(难过), angry(生气), surprised(惊讶), shy(害羞)。"
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
