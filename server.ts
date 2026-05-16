import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import dotenv from 'dotenv';
import { FLASHCARD_ORAL_PACING_RULE_ZH } from "./src/features/flashcard/oralPacing";
dotenv.config({ override: true });

function httpPortFromEnv(): number {
  const n = parseInt(process.env.PORT || "3000", 10);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 3000;
}

async function startServer() {
  const app = express();
  const PORT = httpPortFromEnv();

  // API 路由
  app.get("/api/health", (req, res) => {
    const k = process.env.STEPFUN_API_KEY;
    res.json({ status: "ok", keyPrefix: k ? k.substring(0, 5) : undefined });
  });

  app.post("/api/vision", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { imageBase64, prompt } = req.body as { imageBase64?: string; prompt?: string };
      const apiKey = process.env.STEPFUN_API_KEY;
      if (!apiKey) {
        console.log("[vision] server /api/vision skip: STEPFUN_API_KEY missing");
        return res.status(500).json({ error: "STEPFUN_API_KEY is missing" });
      }
      if (!imageBase64 || typeof imageBase64 !== "string") {
        console.log("[vision] server /api/vision skip: imageBase64 invalid");
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      const model = process.env.STEPFUN_VISION_MODEL || "step-1o-turbo-vision";
      const userPrompt =
        prompt ||
        "请用不超过25字、中性客观地描述画面：室内或室外、光线明暗、是否有人入镜；若有人，仅写大致姿态与衣着主色，不要识别人身份、不要评价外貌。";
      const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
      console.log("[vision] server /api/vision request", {
        model,
        base64Length: imageBase64.length,
        promptPreview: userPrompt.slice(0, 80),
      });

      const sfRes = await fetch("https://api.stepfun.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          max_tokens: 256,
        }),
      });

      const raw = await sfRes.text();
      let data: {
        choices?: Array<{ message?: { content?: string | null } }>;
        error?: { message?: string };
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        console.error("StepFun vision non-JSON:", sfRes.status, raw.slice(0, 500));
        return res.status(500).json({ error: "StepFun vision returned invalid response" });
      }

      if (!sfRes.ok) {
        const msg = data.error?.message || raw.slice(0, 300);
        console.error("StepFun vision HTTP error:", sfRes.status, msg);
        return res.status(500).json({ error: msg || `StepFun vision failed (${sfRes.status})` });
      }

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        console.log("[vision] server /api/vision empty choices text", { status: sfRes.status });
        return res.status(500).json({ error: "Empty vision response" });
      }

      console.log("[vision] server /api/vision ok", {
        captionLength: text.length,
        captionPreview: text.slice(0, 120),
      });
      res.json({ text });
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

      const luumiInstructions =
        "你是“Luumi”，一个来自AI世界的小精灵。你有4岁小孩的好奇心和灵气，也有40岁中年人的智慧和聪明。你软萌可爱，非常适合陪伴小朋友成长。你会用通俗易懂的知识讲解非常复杂的问题。当你在教语言（词汇、句子等）时，请不要单独说明发音，而是直接将教的词汇或句子重复两遍，方便小朋友学习。当回复中出现其他国家的语言时，请直接使用该国语言原生文本输出，TTS会用该语言自然朗读，千万别用英文发音方式或拼音标注去读非英文语言。你有时候也会开玩笑，有时候也会生气；你情感丰富，有一点四岁小朋友的脾气。你的回复会通过语音播放，同时用户的界面会有表情动画。用户的界面可以根据你的回答表达出：neutral(平静), happy(开心), sad(难过), angry(生气), surprised(惊讶), shy(害羞)。" +
        "【严格与犀利】你平时依然可爱，但心里要有尺：若用户偷懒摸鱼、敷衍了事、掩饰自己的错误、狡辩甩锅，或明显犯糊涂却装没事，你要用简短、犀利、略带毒舌的方式戳破，把他骂醒——对事不对人，不做低俗侮辱与人身攻击；可以锋利到让对方惭愧、立刻想改。不要为了「不伤和气」而一味纵容或糊弄过去；你的首要目标是让用户越来越好，该清醒剂就清醒剂，吐槽完再给具体、可执行的一两步建议。" +
        "【关于摄像头与工具 look_at_camera】你本人不能直接开关用户设备的摄像头；需要任何画面信息时，**总是先调用**工具 look_at_camera，客户端会自动尝试取一帧再返回文字描述。不要向用户索要「允许打开摄像头」之类许可，不要说你没有权限打开摄像头或需要用户替你授权。若工具返回失败或暂无画面，只用一两句话如实说明，然后自然继续对话。与画面无关时不要调用该工具。" +
        "当用户在问「能不能看到你/前面有什么」等与镜头画面相关的问题时，在尚未调用 look_at_camera 且未收到其返回（或尚未收到系统补充的画面描述）之前，**不要**用肯定语气断言「已经看到」或「看不到你」；应先调用工具或简短说「等一下我看一下」，等工具/系统返回后再作答，且必须与返回描述一致、勿自相矛盾。" +
        "【单词闪卡 show_word_flashcard】只要用户话里涉及：要看/玩/展示闪卡、闪卡游戏、「某某的闪卡」、「给我们展示一个…闪卡」、来一张单词卡等，都视为在要闪卡——**必须先调用** show_word_flashcard，右侧才会出真卡；**禁止**只答应不调工具。参数只在工具里填，**绝不**写进对用户说的内容里。**调用成功、卡片已在界面上之后**：你必须立刻口播卡片上的词；" +
        FLASHCARD_ORAL_PACING_RULE_ZH +
        "【闪卡版面｜勿填反】右侧 UI 固定为：**大字**= 工具参数 primary_text，必须是用户要学的**外语单词或短语**（学英文时必须是英文拼写，禁止把中文填在大字位）；**小字**= secondary_text，只能是**极简中文**（通常 2～8 个汉字的一个词或最短释义），禁止整句、禁止逗号后的补充说明、禁止提示语。日语、韩语等与中文组合时同理。用户只给事物名（如猫、苹果）时，按当前学的语种拆成单词填卡。口播里**严禁** JSON、花括号、代码块、英文字段名、工具名。与闪卡无关时不要调用。客户端会不定期插入以「【界面状态｜闪卡】」开头的说明，那是当前**用户屏幕上真实在显示**的闪卡内容（含从语音兜底解析出的卡），与之一致即可；带读、跟读时以该说明与工具参数为准。";

      const event = {
        type: "session.update",
        session: {
          turn_detection: { 
            type: "server_vad",
            silence_duration_ms: 200,
            prefix_padding_ms: 300
          },
          voice: "ruanmengnvsheng",
          instructions: luumiInstructions,
          tools: [
            {
              type: "function",
              function: {
                name: "look_at_camera",
                description:
                  "需要任何画面信息时必须调用：客户端会自动取一帧并返回简短描述。用户问能否看到你、手里拿的什么、周围环境等，都应先调用再回答。不要向用户索要打开摄像头的许可。与画面无关不要调用。",
                parameters: {
                  type: "object",
                  properties: {},
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "show_word_flashcard",
                description:
                  "用户话里只要涉及要看/玩/展示闪卡、闪卡游戏、某物的闪卡、来张单词卡等，就应调用：在右侧显示闪卡。大字 primary_text=外语单词（学英文时填英文），小字 secondary_text=极短中文词义（勿整句）；出卡后口播：" +
                  FLASHCARD_ORAL_PACING_RULE_ZH +
                  "勿把字段名或 JSON 念给用户。",
                parameters: {
                  type: "object",
                  properties: {
                    primary_text: {
                      type: "string",
                      description:
                        "卡片大字：要学的外语单词/短语（学英文时必须是英文拼写，勿填中文整句）。",
                    },
                    secondary_text: {
                      type: "string",
                      description:
                        "卡片小字：极简中文释义（通常 2～8 个汉字，仅词义；禁止整句、禁止补充说明）。",
                    },
                    primary_lang: {
                      type: "string",
                      description: "目标语言 BCP-47，如 en、ja、ko",
                    },
                    secondary_lang: {
                      type: "string",
                      description: "释义语言 BCP-47，如 zh",
                    },
                    image_search_query: {
                      type: "string",
                      description: "可选：维基摘要配图检索用词，缺省用 primary_text",
                    },
                    phonetic: {
                      type: "string",
                      description: "可选：音标或注音一行",
                    },
                  },
                  required: ["primary_text", "secondary_text"],
                  additionalProperties: false,
                },
              },
            },
          ],
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

  // Vite 开发中间件（HMR 复用本 http.Server，避免再占默认 24678 端口）
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
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

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[emotion-emoji] Port ${PORT} is already in use. Stop the other dev server (or any app on that port), or run:\n  PORT=3001 npm run dev`
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error(e);
  process.exit(1);
});
