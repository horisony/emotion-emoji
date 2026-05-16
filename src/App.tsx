import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { extractToolCalls, extractToolCallsWide } from './features/realtime/toolCalls';
import { WordFlashCard } from './features/flashcard/WordFlashCard';
import type { WordFlashcardPayload } from './features/flashcard/types';
import { FLASHCARD_ORAL_PACING_RULE_ZH } from './features/flashcard/oralPacing';
import { argsJsonLooksStreamIncomplete, parseWordFlashcardPayload } from './features/flashcard/parsePayload';
import { heuristicFlashcardFromUserChinese } from './features/flashcard/heuristicFromSpeech';
import { scrubTranscriptAndPullFlashcard } from './features/flashcard/transcriptDisplay';
import {
  flashcardUiContextKey,
  requestFlashcardReadAgainTwice,
  requestFlashcardReadAloud,
  sendFlashcardUiToRealtimeConversation,
} from './features/flashcard/uiSync';
import { Smile, Frown, Meh, Angry, AlertCircle, Heart, Laptop, Mic, MicOff, MessageCircle, Camera, CameraOff, Eye } from 'lucide-react';

type Emotion = 'neutral' | 'replying' | 'happy' | 'sad' | 'angry' | 'surprised' | 'shy' | 'working' | 'listening' | 'thinking';

interface EmotionTab {
  id: Emotion;
  label: string;
  icon: React.ReactNode;
}

const emotionTabs: EmotionTab[] = [
  { id: 'neutral', label: '平静', icon: <Meh size={14} /> },
  { id: 'happy', label: '开心', icon: <Smile size={14} /> },
  { id: 'sad', label: '伤心', icon: <Frown size={14} /> },
  { id: 'angry', label: '生气', icon: <Angry size={14} /> },
  { id: 'surprised', label: '惊讶', icon: <AlertCircle size={14} /> },
  { id: 'shy', label: '害羞', icon: <Heart size={14} /> },
  { id: 'working', label: '工作', icon: <Laptop size={14} /> },
  { id: 'listening', label: '聆听', icon: <Mic size={14} /> },
  { id: 'thinking', label: '思考', icon: <MessageCircle size={14} /> },
];

const faceColors: Record<Emotion, string> = {
  neutral: '#fef08a', // yellow-200
  replying: '#fef08a', // 与平静同色：语音回复中（仅精灵头背景流动更快、幅度更大）
  happy: '#fcd34d', // amber-300
  sad: '#bfdbfe', // blue-200
  angry: '#ef4444', // red-500
  surprised: '#e9d5ff', // purple-200
  shy: '#fbcfe8', // pink-200
  working: '#93c5fd', // blue-300 (Screen glow)
  listening: '#fef08a', // yellow-200
  thinking: '#fef08a', // yellow-200
};

// --- Container (Body) Motion Variants ---
const neutralBodyMotion = {
  y: [0, -10, 0],
  rotate: 0,
  scale: 1,
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
};
const faceContainerVariants = {
  neutral: neutralBodyMotion,
  replying: neutralBodyMotion,
  happy: { y: [0, -25, 0], rotate: 0, scale: [1, 1.02, 1], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
  sad: { y: [5, 15, 5], rotate: 0, scale: [1, 0.98, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  angry: { y: [-1.5, 1.5, -1.5], x: [-1.5, 1.5, -1.5], rotate: 0, scale: 1.02, transition: { duration: 0.75, repeat: Infinity, ease: "linear" } },
  surprised: { y: [-15, -20, -15], rotate: 0, scale: 1, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  shy: { y: 0, rotate: [-4, 4, -4], x: [-6, 6, -6], scale: 1, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  working: { y: 0, x: 0, rotate: 0, scale: 1, transition: { duration: 0.5 } },
  listening: { y: [0, -4, 0], rotate: 0, scale: [1, 1.03, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  thinking: { y: [0, 5, 0], rotate: [0, 2, 0, -2, 0], scale: 1, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
};

// --- Left Eyebrow Variants ---
const neutralBrowMotion = {
  rotate: 0,
  y: [0, -2, 0],
  x: 0,
  opacity: 0,
  transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" as const } },
};
const leftEyebrowVariants = {
  neutral: neutralBrowMotion,
  replying: neutralBrowMotion,
  happy: { rotate: -10, y: [-10, -8, -10], x: 0, opacity: 0, transition: { y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } } },
  sad: { rotate: -15, y: [-5, -3, -5], x: 0, opacity: 1, transition: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  angry: { rotate: [25, 27, 25], y: 15, x: 5, opacity: 1, transition: { rotate: { duration: 0.75, repeat: Infinity, ease: "linear" } } },
  surprised: { rotate: -10, y: [-15, -18, -15], x: 0, opacity: 1, transition: { y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } },
  shy: { rotate: 0, y: 0, x: 0, opacity: 0 },
  working: { rotate: 12, y: 8, x: 2, opacity: 1 },
  listening: { rotate: 0, y: 0, x: 0, opacity: 0 },
  thinking: { rotate: 0, y: 0, x: 0, opacity: 0 },
};

// --- Right Eyebrow Variants ---
const rightEyebrowVariants = {
  neutral: neutralBrowMotion,
  replying: neutralBrowMotion,
  happy: { rotate: 10, y: [-10, -8, -10], x: 0, opacity: 0, transition: { y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } } },
  sad: { rotate: 15, y: [-5, -3, -5], x: 0, opacity: 1, transition: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  angry: { rotate: [-25, -27, -25], y: 15, x: -5, opacity: 1, transition: { rotate: { duration: 0.75, repeat: Infinity, ease: "linear" } } },
  surprised: { rotate: 10, y: [-15, -18, -15], x: 0, opacity: 1, transition: { y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } },
  shy: { rotate: 0, y: 0, x: 0, opacity: 0 },
  working: { rotate: -12, y: 8, x: -2, opacity: 1 },
  listening: { rotate: 0, y: 0, x: 0, opacity: 0 },
  thinking: { rotate: 0, y: 0, x: 0, opacity: 0 },
};

// --- Left Eye Variants ---
const neutralEyeMotion = {
  height: 64,
  width: 44,
  borderRadius: "100px",
  y: 0,
  x: 0,
  rotate: 0,
  scaleY: [1, 1, 1, 0.1, 1],
  transition: { scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" as const } },
};
const leftEyeVariants = {
  neutral: neutralEyeMotion,
  replying: neutralEyeMotion,
  happy: { 
    height: 24, width: 60, borderRadius: "100px", y: 15, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  sad: { 
    height: 60, width: 48, borderRadius: "100px", y: 10, x: -4, rotate: 10,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  angry: { 
    height: 56, width: 52, borderRadius: "100px", y: 5, x: 6, rotate: -15,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3.5, repeat: Infinity, times: [0, 0.88, 0.92, 0.96, 1], ease: "easeInOut" } }
  },
  surprised: { 
    height: [68, 72, 68], width: 56, borderRadius: "100px", y: -5, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      height: { duration: 1.5, repeat: Infinity, ease: "easeInOut"},
      scaleY: { duration: 5, repeat: Infinity, times: [0, 0.94, 0.96, 0.98, 1], ease: "easeInOut" }
    } 
  },
  shy: { 
    height: 60, width: 50, borderRadius: "100px", y: 0, x: [0, 4, 0], rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      x: { duration: 3, repeat: Infinity, ease: "easeInOut"},
      scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" }
    } 
  },
  working: { 
    height: 48, width: 44, borderRadius: "100px", y: 15, x: -20, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" }
    } 
  },
  listening: { 
    height: 48, width: 44, borderRadius: "100px", y: 0, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  thinking: { 
    height: 48, width: 44, borderRadius: "100px", y: -10, x: 10, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
};

// --- Right Eye Variants ---
const rightEyeVariants = {
  neutral: neutralEyeMotion,
  replying: neutralEyeMotion,
  happy: { 
    height: 24, width: 60, borderRadius: "100px", y: 15, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  sad: { 
    height: 60, width: 48, borderRadius: "100px", y: 10, x: 4, rotate: -10,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  angry: { 
    height: 56, width: 52, borderRadius: "100px", y: 5, x: -6, rotate: 15,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3.5, repeat: Infinity, times: [0, 0.88, 0.92, 0.96, 1], ease: "easeInOut" } }
  },
  surprised: { 
    height: [68, 72, 68], width: 56, borderRadius: "100px", y: -5, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      height: { duration: 1.5, repeat: Infinity, ease: "easeInOut"},
      scaleY: { duration: 5, repeat: Infinity, times: [0, 0.94, 0.96, 0.98, 1], ease: "easeInOut" }
    } 
  },
  shy: { 
    height: 60, width: 50, borderRadius: "100px", y: 0, x: [0, 4, 0], rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      x: { duration: 3, repeat: Infinity, ease: "easeInOut"},
      scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" }
    } 
  },
  working: { 
    height: 48, width: 44, borderRadius: "100px", y: 15, x: -20, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { 
      scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" }
    } 
  },
  listening: { 
    height: 48, width: 44, borderRadius: "100px", y: 0, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 3, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
  thinking: { 
    height: 48, width: 44, borderRadius: "100px", y: -10, x: 10, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1],
    transition: { scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } }
  },
};

import { SimplePCMPlayer } from './pcmPlayer';

/**
 * 视觉链路调试：过滤控制台 `[vision]`
 * - 开发模式 (npm run dev) 默认开启
 * - 生产环境可在控制台执行：localStorage.setItem('VISION_DEBUG','1') 后刷新
 */
function visionLog(step: string, detail?: unknown) {
  if (typeof window === "undefined") return;
  const enabled =
    import.meta.env.DEV || window.localStorage?.getItem("VISION_DEBUG") === "1";
  if (!enabled) return;
  if (detail !== undefined) {
    console.log("[vision]", step, detail);
  } else {
    console.log("[vision]", step);
  }
}

/** 闪卡 / Realtime 工具链调试：`localStorage.setItem("FLASHCARD_DEBUG","1")` 或 URL `?debug=flashcard` 后控制台过滤 `[flashcard]` */
function flashcardLog(step: string, detail?: unknown) {
  if (typeof window === "undefined") return;
  const enabled =
    import.meta.env.DEV ||
    window.localStorage?.getItem("FLASHCARD_DEBUG") === "1" ||
    window.localStorage?.getItem("VISION_DEBUG") === "1";
  if (!enabled) return;
  if (detail !== undefined) {
    console.log("[flashcard]", step, detail);
  } else {
    console.log("[flashcard]", step);
  }
}

/** 两次「手动拍一张」之间的最小间隔；语音触发的识图（asr）不防抖，避免用户连问「能看见我吗」时被跳过 */
const VISION_DEBOUNCE_MS = 12000;

/** 语音追问「看见我了吗」等时，可复用最近一次成功识图结果，避免每次再等 HTTP（约 5～10 秒量级） */
const VISION_CAPTION_CACHE_TTL_MS = 10_000;

const VISION_DENY =
  /不要看|别看|不用看|不想让你看|不许看|不准看|别瞧|不用瞧|不想让你瞧|don't look|stop looking|don't watch me/i;

const VISION_HINT =
  /看一下|看一看|看看|瞧瞧|瞅瞅|帮我看|你看一下|你看一眼|看一眼|瞟一眼|扫一眼|摄像头|镜头里|镜头|画面里|我手里|我手上|我拿着|我举着|我这边|我在干(什么|啥)|在干什么|在做什么|看得见|能看到|能看见|能看到吗|能看到我吗|可以看见我吗|可以看到我吗|能看见吗|能看见我吗|看得见吗|看得见我吗|看得到吗|看得到我吗|你能看到我吗|你可以看到我吗|你看看我|看我一下|看一下我|看下这个|看看这个|什么颜色|长什么样|长啥样|能不能看到我|能不能看见|看到我吗|看到我了吗|你在看我|你看得见我|有看到我|你能看到我|你能看见我|看见我|你看得到我|看得到我不|看得到我|看得见我|你看不见我|你是不是看不到|怎么看不到|看不到我|还能看到我|你还看得到我|你前面|前面有|前面是|前面什么|前面啥|周围有|周围是|周围什么|附近有什么|环境里|背景里|你看见了什么|你看到了什么|你看到了啥|描述一下|这是啥|这是什么|你现在看到|镜头前面|认出我|识别我|看我一眼|朝我看|朝这边看|你那边|你眼前|瞟一下|瞄一眼|扫一眼环境|当前画面|画面里有什么|can you see me|could you see me|do you see me|are you seeing me|can you look at me|look at me|see me\?|can you see my|can you see what i|what do i look like|what am i wearing|do i look|how do i look|are you able to see me|can you still see me|what('s| is) in front|what do you see|what can you see|describe (the|this) scene|look around|have a look/i;

/** 便于与 ASR 结果做关键词匹配：折叠空白、去掉零宽字符（不把英文词粘在一起） */
function normalizeVisionSpeechText(text: string): string {
  return text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function userSpeechRequestsVision(text: string): boolean {
  const t = normalizeVisionSpeechText(text);
  if (t.length < 2) {
    visionLog("asr.trigger: skip (text too short)", { length: t.length });
    return false;
  }
  if (VISION_DENY.test(t)) {
    visionLog("asr.trigger: skip (matched deny list)", { text: t });
    return false;
  }
  if (VISION_HINT.test(t)) {
    visionLog("asr.trigger: match VISION_HINT", { text: t });
    return true;
  }
  if (/^(see me|look at me)([?!.\s]*)$/i.test(t)) {
    visionLog("asr.trigger: match short English phrase", { text: t });
    return true;
  }
  visionLog("asr.trigger: no match", { text: t });
  return false;
}

/** 用户是否在要「单词闪卡」——尽量宽松：话里提到闪卡/闪卡游戏/展示某卡等即触发（排除明确拒绝） */
function userSpeechRequestsFlashcard(text: string): boolean {
  const t = normalizeVisionSpeechText(text);
  if (t.length < 2) return false;
  if (/不要闪卡|别闪卡|不用闪卡|不(要|玩)闪卡|关掉闪卡|取消闪卡|别给我闪卡/.test(t)) return false;

  if (/闪卡/.test(t)) return true;
  if (/闪\s*卡/.test(t)) return true;
  if (/闪卡游戏|闪卡\s*游|单词闪卡|生词卡|背词卡/.test(t)) return true;
  if (/玩.{0,14}(闪卡|单词卡|生词卡|词卡)|来.{0,6}(玩|一局).{0,8}闪/.test(t)) return true;
  if (/(展示|出示|亮出|打开|看).{0,18}(闪卡|单词卡|生词卡|词卡)/.test(t)) return true;
  if (/(给我们|给咱们|帮我|替我).{0,12}(展示|看|玩|来).{0,14}(闪卡|单词卡|卡)/.test(t)) return true;
  if (/.{0,12}的闪卡/.test(t)) return true;
  if (/.{0,12}闪卡.{0,10}(展示|一下|看看|玩玩)/.test(t)) return true;
  return false;
}

function captureVideoJpegBase64(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  visionLog("capture.meta", {
    videoWidth: vw,
    videoHeight: vh,
    readyState: video.readyState,
  });
  if (!vw || !vh) {
    visionLog("capture.skip", { reason: "videoWxH_zero", videoWidth: vw, videoHeight: vh });
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    visionLog("capture.skip", { reason: "no_2d_context" });
    return null;
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const base64Url = canvas.toDataURL("image/jpeg", 0.5);
  const part = base64Url.split(",")[1] ?? null;
  visionLog("capture.done", { jpegBase64Length: part?.length ?? 0 });
  return part;
}

/** 等待 `<video>` 有有效像素（配合自动打开摄像头后的 getUserMedia） */
async function waitForVideoFrame(
  videoEl: React.RefObject<HTMLVideoElement | null>,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const v = videoEl.current;
    if (v && v.videoWidth > 0 && v.videoHeight > 0) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 70));
  }
  return false;
}

/** 识图提示：避免「长相/外貌」等表述触发平台内容安全误拦 */
const VISION_SCENE_PROMPT =
  "请用不超过25字、中性客观地描述画面：室内或室外、光线明暗、是否有人入镜；若有人，仅写大致姿态与衣着主色，不要识别人身份、不要评价外貌。";

async function requestVisionCaption(imageBase64: string): Promise<string> {
  visionLog("http.vision.request", {
    base64Length: imageBase64.length,
    approxBytes: Math.floor((imageBase64.length * 3) / 4),
  });
  const res = await fetch("/api/vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64,
      prompt: VISION_SCENE_PROMPT,
    }),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok || data.error) {
    visionLog("http.vision.error", { status: res.status, error: data.error });
    throw new Error(data.error || "Vision request failed");
  }
  const cap = String(data.text ?? "").trim();
  visionLog("http.vision.ok", {
    captionLength: cap.length,
    captionPreview: cap.slice(0, 80),
  });
  return cap;
}

export default function App() {
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [wordFlashcard, setWordFlashcard] = useState<WordFlashcardPayload | null>(null);
  const wordFlashcardRef = React.useRef<WordFlashcardPayload | null>(null);
  wordFlashcardRef.current = wordFlashcard;
  /** 已向 Realtime 会话注入过的闪卡 UI 状态键，避免重复 item */
  const lastFlashcardUiSyncKeyRef = React.useRef<string | null>(null);
  /** 已为该卡内容触发过「自动朗读」请求，避免 idle 重复刷 response.create */
  const lastFlashcardAutoReadKeyRef = React.useRef<string | null>(null);
  /** 是否曾在本轮开麦周期内向模型同步过「有卡」状态（用于判断是否要在收起时发关闭说明） */
  const hadOpenFlashcardThisMicRef = React.useRef(false);
  const [systemState, setSystemState] = useState<"connecting" | "idle" | "listening" | "thinking" | "speaking" | "error">("idle");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const readFlashcardAgain = useCallback(() => {
    const ws = wsRef.current;
    const card = wordFlashcardRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !card) return;
    requestFlashcardReadAgainTwice(ws, card);
  }, []);
  const isCameraOnRef = React.useRef(false);
  const lastVisionAtRef = React.useRef(0);
  /** 最近一次成功识图的文案与时间戳；关摄像头时清空，避免答非所问 */
  const lastVisionCaptionCacheRef = React.useRef<{ caption: string; capturedAt: number } | null>(null);
  const fulfilledToolCallIdsRef = React.useRef(new Set<string>());
  const visionInFlightRef = React.useRef(false);
  const runVisionManualRef = React.useRef<(() => void) | null>(null);
  /** 发过「必须调闪卡工具」的 user 注入后，若本轮仍无成功工具结果，用中文语音猜一张兜底卡 */
  const lastFlashcardNudgeUtteranceRef = React.useRef<string | null>(null);
  /** 本轮 response 内是否已成功解析并展示过闪卡工具 */
  const flashcardToolSucceededThisResponseRef = React.useRef(false);
  /** URL `?debug=flashcard` 或 localStorage FLASHCARD_DEBUG：右下角调试板 + 记录 WS 事件类型 */
  const [flashcardDebugUi, setFlashcardDebugUi] = useState(false);
  const [wsDebugRing, setWsDebugRing] = useState<string[]>([]);
  const flashcardDebugUiRef = React.useRef(false);
  flashcardDebugUiRef.current = flashcardDebugUi;

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("debug") === "flashcard") {
        localStorage.setItem("FLASHCARD_DEBUG", "1");
        setFlashcardDebugUi(true);
      } else if (localStorage.getItem("FLASHCARD_DEBUG") === "1") {
        setFlashcardDebugUi(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /** 关麦时清闪卡；不要在每次 WS onopen 清（重连 / StrictMode 会误清导致永远看不到卡） */
  useEffect(() => {
    if (!isMicOn) {
      setWordFlashcard(null);
      lastFlashcardNudgeUtteranceRef.current = null;
      lastFlashcardUiSyncKeyRef.current = null;
      lastFlashcardAutoReadKeyRef.current = null;
      hadOpenFlashcardThisMicRef.current = false;
    }
  }, [isMicOn]);

  /** 闪卡 UI 与 Realtime 同步；非工具出卡在会话 idle 时自动请求 AI 口播卡片 */
  useEffect(() => {
    if (!isMicOn) return;
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const key = flashcardUiContextKey(wordFlashcard);

    if (!wordFlashcard) {
      if (!hadOpenFlashcardThisMicRef.current) return;
      hadOpenFlashcardThisMicRef.current = false;
      if (lastFlashcardUiSyncKeyRef.current === key) return;
      lastFlashcardUiSyncKeyRef.current = key;
      sendFlashcardUiToRealtimeConversation(socket, null);
      flashcardLog("ui_sync.conversation_inject", { key: "__closed__", hasCard: false });
      lastFlashcardAutoReadKeyRef.current = null;
      return;
    }

    hadOpenFlashcardThisMicRef.current = true;
    if (lastFlashcardUiSyncKeyRef.current !== key) {
      lastFlashcardUiSyncKeyRef.current = key;
      sendFlashcardUiToRealtimeConversation(socket, wordFlashcard);
      flashcardLog("ui_sync.conversation_inject", {
        key: key.slice(0, 72),
        hasCard: true,
      });
    }

    if (systemState !== "idle") {
      flashcardLog("read_aloud.wait_idle", { key: key.slice(0, 72), state: systemState });
      return;
    }

    if (lastFlashcardAutoReadKeyRef.current === key) return;
    lastFlashcardAutoReadKeyRef.current = key;
    requestFlashcardReadAloud(socket, wordFlashcard);
    flashcardLog("read_aloud.trigger", { key: key.slice(0, 72) });
  }, [wordFlashcard, isMicOn, systemState]);

  React.useEffect(() => {
    isCameraOnRef.current = isCameraOn;
    if (!isCameraOn) {
      if (lastVisionCaptionCacheRef.current) {
        visionLog("vision.cache.cleared", { reason: "camera_off" });
      }
      lastVisionCaptionCacheRef.current = null;
    }
  }, [isCameraOn]);

  useEffect(() => {
    if (isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        streamRef.current = stream;
        visionLog("camera.stream.open", {
          videoTracks: stream.getVideoTracks().map((tr) => ({ label: tr.label, readyState: tr.readyState })),
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch((err) => {
        visionLog("camera.stream.error", { err: String(err) });
        console.error("Camera error:", err);
        setIsCameraOn(false);
      });
    } else {
      visionLog("camera.off", { stoppedTracks: streamRef.current?.getTracks().length ?? 0 });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraOn]);

  useEffect(() => {
    if (!isMicOn) return;

    let ws: WebSocket | null = null;
    let player: SimplePCMPlayer | null = null;
    let isStopped = false;
    let recorder: import('./audio').AudioRecorder | null = null;

    const startAudioProcessing = async () => {
      try {
        setSystemState("connecting");
        setTranscript("连接中...");
        
        ws = new WebSocket(window.location.protocol.replace('http', 'ws') + '//' + window.location.host + '/api/realtime');
        wsRef.current = ws;
        
        ws.onopen = async () => {
          console.log("Connected to local proxy");
          visionLog("mic.ws.open", { clearedFulfilledToolCallIds: true, clearedVisionCaptionCache: true });
          fulfilledToolCallIdsRef.current.clear();
          lastVisionCaptionCacheRef.current = null;
          player = new SimplePCMPlayer();
          setSystemState("idle");
          setEmotion("neutral");
          setTranscript("我是表情包，请对我说话~");

          try {
            const { AudioRecorder } = await import('./audio');
            recorder = new AudioRecorder();
            await recorder.start((base64Audio) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'input_audio_buffer.append',
                  audio: base64Audio
                }));
              }
            });
            /** effect 可能尚未在 OPEN 后跑过：补推当前闪卡，避免「先注入调试卡再连上 WS」时模型不知道卡面 */
            if (ws && ws.readyState === WebSocket.OPEN && wordFlashcardRef.current) {
              hadOpenFlashcardThisMicRef.current = true;
              lastFlashcardUiSyncKeyRef.current = null;
              const k = flashcardUiContextKey(wordFlashcardRef.current);
              lastFlashcardUiSyncKeyRef.current = k;
              sendFlashcardUiToRealtimeConversation(ws, wordFlashcardRef.current);
              flashcardLog("ui_sync.ws_open_recovery", { key: k.slice(0, 72) });
            }
          } catch(err: any) {
            console.error("Audio processing initialized failed:", err);
            setTranscript("麦克风初始化失败: " + err.message);
            setIsMicOn(false);
          }
        };

        let fullTranscript = "";

        /** 先取消可能进行中的回复，再注入上下文并 response.create，避免服务端报「冲突」类错误 */
        const cancelInFlightResponseThen = (then: () => void) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          visionLog("send.cancel_inflight", {});
          ws.send(JSON.stringify({ type: "response.cancel" }));
          window.setTimeout(() => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            then();
          }, 120);
        };

        /** 用户语音里出现「闪卡」等但模型未调工具时：打断当前回复并插入强约束 user 消息，逼下一轮先 show_word_flashcard */
        const sendFlashcardIntentNudge = (userSaid: string) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          lastFlashcardNudgeUtteranceRef.current = userSaid;
          flashcardToolSucceededThisResponseRef.current = false;
          const text =
            "【系统补充｜必须执行】用户刚才说：「" +
            userSaid +
            "」。这是在要「单词闪卡」或玩闪卡相关。你必须在本轮里**先调用**工具 show_word_flashcard：primary_text=要学的外语单词（学英文时**必须英文拼写**，作界面**大字**），secondary_text=**极简中文释义**（**小字**，通常 2～8 个汉字，禁止整句、禁止补充说明）。按用户说的主题填好两字段。**出卡之后**口播：" +
            FLASHCARD_ORAL_PACING_RULE_ZH +
            "不要只出卡不念。**禁止**只口头答应却不调用工具；**禁止**在口播里出现 JSON、花括号、工具名或英文字段名。";
          visionLog("send.flashcard_intent_nudge", { preview: userSaid.slice(0, 100) });
          flashcardLog("send.flashcard_intent_nudge", { preview: userSaid.slice(0, 100) });
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "user",
                content: [{ type: "input_text", text }],
              },
            })
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        };

        const sendVisionToolResult = (callId: string, output: string) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("send.tool_result.skip", { reason: "ws_not_ready", callId });
            return;
          }
          visionLog("send.tool_result", {
            callId,
            outputLen: output.length,
            outputPreview: output.slice(0, 120),
          });
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output,
              },
            })
          );
          ws.send(JSON.stringify({ type: "response.create" }));
          visionLog("send.tool_result.done", { callId, sentResponseCreate: true });
        };

        const sendFlashcardToolResult = (callId: string, output: string) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("send.flashcard_tool_result.skip", { reason: "ws_not_ready", callId });
            return;
          }
          visionLog("send.flashcard_tool_result", { callId, outputLen: output.length });
          ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output,
              },
            })
          );
          ws.send(JSON.stringify({ type: "response.create" }));
        };

        const tryFlashcardToolCall = (callId: string, argumentsStr: string) => {
          if (!callId) return;
          const t = argumentsStr.trim();
          /** output_item.done 有时先于参数字符串流式完成，避免用 "{}" 占位把 call_id 锁死 */
          if (t.length < 5 || t === "{}") {
            visionLog("flashcard.fulfil.skip_empty_args", { callId, len: t.length });
            flashcardLog("fulfil.skip_empty_args", { callId, len: t.length });
            return;
          }
          if (fulfilledToolCallIdsRef.current.has(callId)) return;
          const payload = parseWordFlashcardPayload(argumentsStr);
          if (payload) {
            fulfilledToolCallIdsRef.current.add(callId);
            visionLog("flashcard.fulfil.ok", { callId, word: payload.primary_text });
            flashcardLog("fulfil.ok", { callId, word: payload.primary_text });
            lastFlashcardNudgeUtteranceRef.current = null;
            flashcardToolSucceededThisResponseRef.current = true;
            setWordFlashcard(payload);
            sendFlashcardToolResult(
              callId,
              JSON.stringify({
                ok: true,
                displayed: true,
                speak_now:
                  "请立即用语音朗读本闪卡。" +
                  FLASHCARD_ORAL_PACING_RULE_ZH +
                  "不要 JSON、花括号、工具名或英文字段名。",
              })
            );
          } else if (argsJsonLooksStreamIncomplete(t)) {
            visionLog("flashcard.fulfil.incomplete_args_wait", { callId, len: t.length });
            flashcardLog("fulfil.incomplete_args_wait", { callId, len: t.length });
          } else {
            fulfilledToolCallIdsRef.current.add(callId);
            visionLog("flashcard.fulfil.bad_args", { callId, preview: argumentsStr.slice(0, 160) });
            flashcardLog("fulfil.bad_args", { callId, preview: argumentsStr.slice(0, 160) });
            sendFlashcardToolResult(
              callId,
              JSON.stringify({ ok: false, error: "invalid_flashcard_args" })
            );
          }
        };

        const fulfilFlashcardToolsFromEvent = (evt: {
          response?: { output?: Array<Record<string, unknown>> };
          item?: Record<string, unknown>;
        }) => {
          for (const { callId, arguments: argStr } of extractToolCallsWide(evt, "show_word_flashcard")) {
            tryFlashcardToolCall(callId, argStr);
          }
        };

        type VisionInjectOpts = { omitResponseCancel?: boolean; fromCaptionCache?: boolean };

        /**
         * 注入「刚截取的摄像头描述」并触发下一轮语音回复。
         * - 用 role=user + input_text：部分 Realtime 实现对后插 system 权重弱，模型会忽略画面仍说「看不见」。
         * - omitResponseCancel：语音/手动识图已在截帧前 response.cancel 过，此处再 cancel 会触发「无回复可取消」的空错误，并可能干扰后续 response.create。
         */
        const sendVisionSystemAndContinue = (caption: string, opts?: VisionInjectOpts) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("send.system_vision.skip", { reason: "ws_not_ready" });
            return;
          }
          visionLog("send.system_vision", {
            captionLen: caption.length,
            captionPreview: caption.slice(0, 120),
            omitResponseCancel: Boolean(opts?.omitResponseCancel),
            fromCaptionCache: Boolean(opts?.fromCaptionCache),
          });
          const injectAndRespond = () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const intro = opts?.fromCaptionCache
              ? "【以下为刚才数秒内已成功识别过的同一摄像头画面描述（本次对话未重新截图、未再调识图接口），可直接用于回答用户当前这句语音】\n"
              : "【同一轮对话里，客户端刚根据你上一条语音截取的摄像头画面——客观描述如下】\n";
            const userText = `${intro}${caption}\n【硬性要求】若以上描述中出现「有人入镜」或能合理推断有人（如坐姿、衣着主色、人体轮廓、书架前有人等），你必须用自然口语回答「能」或「好像能看见你」，并顺势用一两句引用描述中的依据；仅当描述明确写「无人入镜」或完全无法判断是否有人时，才可以说看不清。禁止与以上画面描述矛盾，禁止在有人入镜时仍说「看不见你」。`;
            ws.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "user",
                  content: [{ type: "input_text", text: userText }],
                },
              })
            );
            ws.send(JSON.stringify({ type: "response.create" }));
            visionLog("send.system_vision.done", { sentResponseCreate: true });
          };
          if (opts?.omitResponseCancel) {
            visionLog("send.system_vision.inject_deferred", { delayMs: 90 });
            window.setTimeout(injectAndRespond, 90);
          } else {
            cancelInFlightResponseThen(injectAndRespond);
          }
        };

        /** 识图失败时仅通知模型，不把错误文案当「画面描述」 */
        const sendSystemNoticeAndContinue = (text: string, opts?: VisionInjectOpts) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("send.system_notice.skip", { reason: "ws_not_ready" });
            return;
          }
          visionLog("send.system_notice", {
            textLen: text.length,
            textPreview: text.slice(0, 100),
            omitResponseCancel: Boolean(opts?.omitResponseCancel),
          });
          const injectAndRespond = () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "system",
                  content: [{ type: "input_text", text }],
                },
              })
            );
            ws.send(JSON.stringify({ type: "response.create" }));
            visionLog("send.system_notice.done", { sentResponseCreate: true });
          };
          if (opts?.omitResponseCancel) {
            visionLog("send.system_notice.inject_deferred", { delayMs: 90 });
            window.setTimeout(injectAndRespond, 90);
          } else {
            cancelInFlightResponseThen(injectAndRespond);
          }
        };

        const tryVisionPipeline = async (kind: "tool" | "asr" | "button", callId?: string) => {
          visionLog("pipeline.enter", {
            kind,
            callId: callId ?? null,
            wsReady: ws?.readyState === WebSocket.OPEN,
            inFlight: visionInFlightRef.current,
            cameraOn: isCameraOnRef.current,
            debounceMsLeft:
              kind === "button"
                ? Math.max(0, VISION_DEBOUNCE_MS - (Date.now() - lastVisionAtRef.current))
                : null,
          });

          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("pipeline.skip", { reason: "ws_not_open" });
            return;
          }
          if (visionInFlightRef.current) {
            visionLog("pipeline.skip", { reason: "already_in_flight" });
            return;
          }
          if (
            kind === "button" &&
            Date.now() - lastVisionAtRef.current < VISION_DEBOUNCE_MS
          ) {
            visionLog("pipeline.skip", {
              reason: "debounce_button_only",
              waitMs: VISION_DEBOUNCE_MS - (Date.now() - lastVisionAtRef.current),
            });
            return;
          }
          if (kind === "tool" && callId && fulfilledToolCallIdsRef.current.has(callId)) {
            visionLog("pipeline.skip", { reason: "tool_call_id_already_fulfilled", callId });
            return;
          }

          visionInFlightRef.current = true;
          try {
            // 语音/手动触发的识图：服务端往往在「转写完成」之前就已开始生成回复，容易先随口说「看不到」。
            // 在截帧与识图 HTTP 之前立刻打断当前回复并清空已缓冲的 TTS，等画面描述注入后再 response.create。
            if ((kind === "asr" || kind === "button") && ws && ws.readyState === WebSocket.OPEN) {
              visionLog("pipeline.cancel_inflight_before_capture", { kind });
              ws.send(JSON.stringify({ type: "response.cancel" }));
              player?.clearAll();
              setSystemState("thinking");
              setEmotion("thinking");
              setTranscript(kind === "button" ? "拍一张…" : "看一下画面…");
            }

            // 语音追问：10 秒内复用上次成功识图，不再等 HTTP（手动点小眼睛仍每次截新帧）
            if (kind === "asr") {
              const slot = lastVisionCaptionCacheRef.current;
              if (slot && Date.now() - slot.capturedAt < VISION_CAPTION_CACHE_TTL_MS) {
                visionLog("pipeline.cache_hit", {
                  ageMs: Date.now() - slot.capturedAt,
                  captionLen: slot.caption.length,
                });
                lastVisionAtRef.current = Date.now();
                setTranscript("沿用刚才的画面…");
                sendVisionSystemAndContinue(slot.caption, {
                  omitResponseCancel: true,
                  fromCaptionCache: true,
                });
                return;
              }
            }

            if (!isCameraOnRef.current) {
              visionLog("pipeline.auto_turn_on_camera", { kind });
              setIsCameraOn(true);
            }

            const ready = await waitForVideoFrame(videoRef, 7500);
            if (!ready || !videoRef.current) {
              visionLog("pipeline.branch", {
                branch: "video_not_ready_after_wait",
                kind,
                hasVideoEl: Boolean(videoRef.current),
                vw: videoRef.current?.videoWidth,
                vh: videoRef.current?.videoHeight,
              });
              if (kind === "tool" && callId) {
                fulfilledToolCallIdsRef.current.add(callId);
                sendVisionToolResult(
                  callId,
                  "（摄像头工具：暂时未能取得画面。请自然继续对话，不要向用户索要打开摄像头的许可，也不要说你没有权限操作摄像头；可简单说这边还没拿到画面。）"
                );
              } else if (kind === "asr" || kind === "button") {
                sendSystemNoticeAndContinue(
                  "（系统：当前未能取得摄像头画面（可能浏览器未授权相机或设备暂不可用）。请简短回复用户，不要索要授权、不要自称无权打开摄像头。）",
                  { omitResponseCancel: true }
                );
              }
              return;
            }

            await new Promise<void>((r) => requestAnimationFrame(() => r()));

            const b64 = captureVideoJpegBase64(videoRef.current);
            if (!b64) {
              visionLog("pipeline.branch", { branch: "capture_failed_empty_jpeg", kind });
              if (kind === "tool" && callId) {
                fulfilledToolCallIdsRef.current.add(callId);
                sendVisionToolResult(
                  callId,
                  "（摄像头工具：当前截到的是空画面。请继续对话，不要向用户索要摄像头权限。）"
                );
              } else if (kind === "asr" || kind === "button") {
                sendSystemNoticeAndContinue(
                  "（系统：截图为空。请自然回应用户，不要索要摄像头授权。）",
                  { omitResponseCancel: true }
                );
              }
              return;
            }

            const caption = await requestVisionCaption(b64);
            lastVisionAtRef.current = Date.now();
            lastVisionCaptionCacheRef.current = { caption, capturedAt: Date.now() };

            if (kind === "tool" && callId) {
              fulfilledToolCallIdsRef.current.add(callId);
              visionLog("pipeline.success", { branch: "tool_function_output", callId });
              sendVisionToolResult(callId, `（摄像头一帧）${caption}`);
            } else {
              visionLog("pipeline.success", { branch: "system_message_plus_response_create", kind });
              sendVisionSystemAndContinue(caption, {
                omitResponseCancel: kind === "asr" || kind === "button",
              });
            }
          } catch (err) {
            visionLog("pipeline.error", { kind, callId: callId ?? null, err: String(err) });
            console.error("Vision pipeline error", err);
            const errStr = String(err);
            const isBlocked = /blocked|内容安全|安全策略|风控|moderation|policy/i.test(errStr);
            if (kind === "tool" && callId) {
              fulfilledToolCallIdsRef.current.add(callId);
              sendVisionToolResult(
                callId,
                isBlocked
                  ? "（摄像头工具：本次截图未通过平台内容安全校验，无法生成画面描述。请如实告诉用户并建议稍后重试或调整角度；不要编造你看到了对方外貌。）"
                  : "（摄像头工具：画面识别暂时失败，请稍后再试。）"
              );
            } else if (kind === "asr" || kind === "button") {
              if (isBlocked) {
                sendSystemNoticeAndContinue(
                  "（系统：摄像头截图在识图接口被平台内容安全策略拦截，未取得画面描述。请用口语说明「刚才的画面暂时不能由系统分析」；不要编造你看到了用户；可建议换角度、调光线或稍后再试。）",
                  { omitResponseCancel: true }
                );
              } else {
                sendSystemNoticeAndContinue(
                  "（系统：画面识别请求失败。请简短回应用户，不要向用户索要打开摄像头的许可，也不要自称没有权限操作摄像头。）",
                  { omitResponseCancel: true }
                );
              }
            }
          } finally {
            visionInFlightRef.current = false;
            visionLog("pipeline.exit", { kind, callId: callId ?? null });
          }
        };

        runVisionManualRef.current = () => {
          visionLog("manual.button.click");
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            visionLog("manual.button.skip", { reason: "ws_not_ready" });
            return;
          }
          void tryVisionPipeline("button");
        };

        ws.onmessage = (e) => {
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(e.data) as Record<string, unknown>;
          } catch (parseErr) {
            visionLog("ws.parse_error", { err: String(parseErr), rawPreview: String(e.data).slice(0, 200) });
            return;
          }
          const evType = event.type as string | undefined;

          if (flashcardDebugUiRef.current && evType) {
            const snippet =
              /function|tool|output_item|conversation\.item/i.test(evType) ||
              (typeof event.name === "string" && event.name.includes("flashcard"))
                ? String(e.data).slice(0, 140)
                : "";
            setWsDebugRing((prev) =>
              [...prev, `${((performance.now() / 10) | 0) % 100000} ${evType}${snippet ? ` | ${snippet}` : ""}`].slice(
                -40
              )
            );
          }
          if (typeof window !== "undefined" && window.localStorage?.getItem("REALTIME_DEBUG") === "1") {
            console.log("[realtime]", evType, event);
          }

          switch (evType) {
            case 'input_audio_buffer.speech_started':
              setSystemState("listening");
              setEmotion("listening");
              setTranscript("我正在听...");
              if (player) player.clearAll();
              break;
            case 'input_audio_buffer.speech_stopped':
              setSystemState("thinking");
              setEmotion("thinking");
              setTranscript("处理中...");
              break;
            case 'response.created':
               setSystemState("thinking");
               setEmotion("thinking");
               if (player) player.clearAll();
               fullTranscript = "";
               flashcardToolSucceededThisResponseRef.current = false;
               break;
            case 'response.audio_transcript.delta':
            case 'response.text.delta':
              if (event.delta) {
                fullTranscript += String(event.delta);
                const { text: clean, pulled } = scrubTranscriptAndPullFlashcard(fullTranscript);
                fullTranscript = clean;
                if (pulled && !flashcardToolSucceededThisResponseRef.current) {
                  visionLog("flashcard.from_transcript", { word: pulled.primary_text });
                  flashcardLog("from_transcript.delta", { word: pulled.primary_text });
                  setWordFlashcard(pulled);
                }
                const line = clean.trim();
                setTranscript(line ? "回复: " + line : "回复中…");
              }
              break;
            case 'response.function_call_arguments.done': {
              const raw = event as Record<string, unknown>;
              const nested =
                typeof raw.item === "object" && raw.item !== null
                  ? (raw.item as Record<string, unknown>)
                  : {};
              const name = String(raw.name ?? nested.name ?? "");
              const callId = String(
                raw.call_id ?? raw.callId ?? nested.call_id ?? nested.callId ?? raw.item_id ?? ""
              );
              const args = String(raw.arguments ?? nested.arguments ?? "{}");
              visionLog("ws.function_call_arguments.done", {
                name,
                callId,
                argsLen: args.length,
                argsPreview: args.slice(0, 120),
              });
              flashcardLog("ws.function_call_arguments.done", { name, callId, argsLen: args.length });
              if (name === "show_word_flashcard" && callId) {
                tryFlashcardToolCall(callId, args);
              } else if (name === "look_at_camera" && callId) {
                void tryVisionPipeline("tool", callId);
              }
              break;
            }
            case 'conversation.item.done': {
              const item = event.item as Record<string, unknown> | undefined;
              visionLog("ws.conversation.item.done", {
                itemType: item?.type,
                itemName: item?.name,
                keys: item ? Object.keys(item) : [],
              });
              const cam = extractToolCalls({ item }, "look_at_camera");
              if (cam.length > 0) {
                visionLog("tool.parse.hit", {
                  tool: "look_at_camera",
                  count: cam.length,
                  callIds: cam.map((o) => o.callId),
                });
              }
              for (const { callId } of cam) {
                void tryVisionPipeline("tool", callId);
              }
              fulfilFlashcardToolsFromEvent({ item });
              break;
            }
            case 'response.output_item.added': {
              const item = event.item as Record<string, unknown> | undefined;
              visionLog("ws.output_item.added", {
                itemType: item?.type,
                itemName: item?.name,
                itemKeys: item ? Object.keys(item) : [],
              });
              fulfilFlashcardToolsFromEvent({ item });
              break;
            }
            case 'response.output_item.done': {
              visionLog("ws.output_item.done", {
                itemType: (event.item as { type?: string } | undefined)?.type,
                itemName: (event.item as { name?: string } | undefined)?.name,
                itemKeys: event.item ? Object.keys(event.item as object) : [],
              });
              const calls = extractToolCalls({ item: event.item as Record<string, unknown> }, "look_at_camera");
              if (calls.length > 0) {
                visionLog("tool.parse.hit", {
                  tool: "look_at_camera",
                  count: calls.length,
                  callIds: calls.map((o) => o.callId),
                });
              }
              for (const { callId } of calls) {
                void tryVisionPipeline("tool", callId);
              }
              fulfilFlashcardToolsFromEvent({ item: event.item as Record<string, unknown> });
              break;
            }
            case 'conversation.item.input_audio_transcription.completed': {
              const raw =
                typeof event.transcript === "string"
                  ? event.transcript
                  : typeof (event as { text?: unknown }).text === "string"
                    ? String((event as { text?: string }).text)
                    : "";
              const hitVision = userSpeechRequestsVision(raw);
              const hitFlash = userSpeechRequestsFlashcard(raw);
              visionLog("ws.asr.completed", {
                transcript: raw,
                cameraOn: isCameraOnRef.current,
                willRunVision: hitVision,
                willFlashcardNudge: hitFlash,
              });
              // 闪卡意图优先：避免「看一下猫的闪卡」同时走识图与闪卡两条 cancel 链互相打架
              if (hitFlash && ws && ws.readyState === WebSocket.OPEN) {
                flashcardLog("asr.flashcard_intent", { raw });
                if (player) player.clearAll();
                setSystemState("thinking");
                setEmotion("thinking");
                setTranscript("准备闪卡…");
                cancelInFlightResponseThen(() => {
                  if (!ws || ws.readyState !== WebSocket.OPEN) return;
                  sendFlashcardIntentNudge(raw);
                });
              } else if (hitVision) {
                // 不依赖「摄像头已开」：tryVisionPipeline 会在需要时自动 setIsCameraOn(true)
                void tryVisionPipeline("asr");
              }
              break;
            }
            case 'response.audio.delta': // playback
              setSystemState("speaking");
              let nextEmo: Emotion = 'neutral';
              if (/(生|讨厌|坏|傻|笨|烦|滚|气|不理你|闭嘴)/.test(fullTranscript)) nextEmo = 'angry';
              else if (/(哇|天哪|天呐|真的|居然|神奇|惊讶|怎么可能|太厉害)/.test(fullTranscript)) nextEmo = 'surprised';
              else if (/(夸|爱我|美|帅|不好意思|害羞|喜欢你|么么哒)/.test(fullTranscript)) nextEmo = 'shy';
              else if (/(好|开心|喜欢|棒|谢谢|哈哈|不错|赞|对|可以)/.test(fullTranscript)) nextEmo = 'happy';
              else if (/(难过|悲伤|哎|哭|惨|可惜|不要)/.test(fullTranscript)) nextEmo = 'sad';
              // 平静语气回复时：用 replying（五官同平静，精灵头背景单独更动感）
              setEmotion(nextEmo === "neutral" ? "replying" : nextEmo);

              if (player && event.delta) {
                player.appendPCM(String(event.delta));
              }
              break;
            case 'response.done': {
              const calls = extractToolCalls(event, "look_at_camera");
              if (calls.length > 0) {
                visionLog("response.done.tool_scan", {
                  tool: "look_at_camera",
                  callCount: calls.length,
                  callIds: calls.map((c) => c.callId),
                });
              } else {
                const resp = event.response as
                  | { status?: string; output?: Array<Record<string, unknown>> }
                  | undefined;
                if (Array.isArray(resp?.output) && resp.output.length > 0) {
                  visionLog("response.done.tool_scan_empty", {
                    responseStatus: resp?.status,
                    outputTypes: resp.output.map((o) => String(o.type ?? o["object"] ?? "?")),
                  });
                }
              }
              const seen = new Set<string>();
              for (const { callId } of calls) {
                if (seen.has(callId)) continue;
                seen.add(callId);
                void tryVisionPipeline("tool", callId);
              }
              fulfilFlashcardToolsFromEvent(event);
              const fcScan = extractToolCallsWide(event, "show_word_flashcard");
              flashcardLog("response.done.flashcard_wide_scan", { count: fcScan.length });
              const fin = scrubTranscriptAndPullFlashcard(fullTranscript);
              fullTranscript = fin.text;
              /** 工具出卡优先：勿用转写 JSON 或 hello 启发式覆盖本轮已成功的闪卡 */
              if (flashcardToolSucceededThisResponseRef.current) {
                flashcardLog("flashcard.response_done.keep_tool_card", {});
              } else if (fin.pulled) {
                visionLog("flashcard.from_transcript.final", { word: fin.pulled.primary_text });
                flashcardLog("from_transcript.response_done", { word: fin.pulled.primary_text });
                setWordFlashcard(fin.pulled);
                lastFlashcardNudgeUtteranceRef.current = null;
              } else if (lastFlashcardNudgeUtteranceRef.current) {
                const src = lastFlashcardNudgeUtteranceRef.current;
                const guess = heuristicFlashcardFromUserChinese(src);
                if (guess) {
                  flashcardLog("fallback.heuristic_card", guess);
                  setWordFlashcard(guess);
                } else {
                  flashcardLog("fallback.heuristic_skip", { src: src.slice(0, 80) });
                }
                lastFlashcardNudgeUtteranceRef.current = null;
              }
              setTranscript(
                fullTranscript.trim()
                  ? "回复: " + fullTranscript.trim()
                  : "我是表情包，请对我说话~"
              );
              setSystemState("idle");
              setTimeout(() => {
                if (!isStopped) setEmotion("neutral");
              }, 3000);
              break;
            }
            case 'error': {
              const errNested = event.error as { message?: string; code?: string; type?: string } | undefined;
              const errMsg = String(
                (typeof event.message === "string" && event.message) ||
                  (typeof errNested?.message === "string" && errNested.message) ||
                  ""
              );
              const errCode = typeof errNested?.code === "string" ? errNested.code : "";
              visionLog("ws.error", { message: errMsg, code: errCode, type: errNested?.type });

              if (!errMsg) {
                visionLog("ws.error.empty_ignored", {
                  note: "常见于无进行中回复时再次 response.cancel；已改为语音识图路径不再二次 cancel",
                });
                break;
              }

              console.error(errMsg);

              const isAuthOrConfig =
                errMsg.includes("API_KEY") ||
                /not configured|未配置|401|403|unauthoriz|invalid.*key|鉴权|密钥/i.test(errMsg);

              if (isAuthOrConfig) {
                setSystemState("error");
                if (errMsg.includes("API_KEY")) {
                  setTranscript("请在设置中配置 STEPFUN_API_KEY 哦~");
                } else {
                  setTranscript("连接出错: " + errMsg);
                }
                setIsMicOn(false);
                break;
              }

              // 其它错误（常见：在对话期误发 response.create 与当前回复冲突）：不关麦，避免对话被无辜打断
              setSystemState("idle");
              setTranscript("服务提示: " + errMsg.slice(0, 200));
              break;
            }
            default:
              if (
                evType &&
                /transcription|session\.updated|input_audio_buffer\.committed|conversation\.item\.created$/i.test(
                  evType
                )
              ) {
                visionLog("ws.event.misc", { type: evType });
              }
              break;
          }
        };
      } catch(err: any) {
        console.error(err);
        setSystemState("error");
        setTranscript("WebSocket 初始化失败: " + err.message);
        setIsMicOn(false);
      }
    };

    startAudioProcessing();

    return () => {
      isStopped = true;
      runVisionManualRef.current = null;
      if (recorder) {
        recorder.stop();
      }
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
      if (player) {
         player.clearAll();
      }
    };
  }, [isMicOn]);

  /** 语音回复中（replying）：精灵头内层光晕与色块流动更快、幅度更大，五官仍同平静 */
  const spiritReplyBg = emotion === "replying";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center font-sans py-16 px-4 relative w-full overflow-x-auto overflow-y-auto">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15], x: [0, 50, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-indigo-500/30 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1], x: [0, -30, 0], y: [0, 60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] bg-fuchsia-500/20 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.2, 0.05] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-blue-500/20 rounded-full blur-[150px]"
        />
      </div>

      {/* Header & Controls */}
      <div className="max-w-4xl w-full flex flex-col items-center space-y-4 mb-8 md:mb-10 z-10 relative px-1">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-100 tracking-tight">Luumi</h1>
        </div>

        {/* Tags / Tabs — 单行可横向滚动 */}
        <div className="flex w-full max-w-full flex-nowrap justify-center gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {emotionTabs.map((tab) => {
            const isActive = emotion === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEmotion(tab.id)}
                className={`relative shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 flex items-center gap-1 shadow-sm
                  ${isActive 
                    ? 'text-white' 
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-slate-700 shadow-lg shadow-black/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Face + optional flashcard：self-stretch 打破父级 items-center，否则行宽塌缩、右侧闪卡被 overflow 裁掉 */}
      <div className="relative z-10 flex min-h-0 flex-1 w-full max-w-full self-stretch flex-col items-center justify-center px-2 sm:px-4 md:px-6 pb-6">
        <div
          className={
            wordFlashcard
              ? "grid w-full max-w-6xl mx-auto grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-6 lg:gap-8"
              : "flex w-full justify-center"
          }
        >
          <div
            className={`flex w-full shrink-0 justify-center overflow-visible transition-transform duration-300 ease-out will-change-transform ${
              wordFlashcard
                ? "md:justify-end md:pr-2 scale-[0.66] translate-x-2 md:scale-[0.7] md:translate-x-4 lg:translate-x-6"
                : "scale-90 translate-x-0"
            }`}
          >
            {/* Container for the bouncy whole-body movements */}
            <motion.div
              variants={faceContainerVariants}
              initial="neutral"
              animate={emotion}
              className="relative w-80 h-80 flex justify-center"
            >
          {/* Glowing Spirit Face Base (Blurred for flowing edges) */}
          <motion.div
            animate={{
              borderRadius: [
                "55% 45% 40% 60% / 60% 45% 55% 40%",
                "45% 55% 50% 50% / 50% 55% 45% 50%",
                "55% 45% 40% 60% / 60% 45% 55% 40%",
              ],
              boxShadow: spiritReplyBg
                ? [
                    `0 0 72px 16px ${faceColors[emotion]}77`,
                    `0 0 118px 32px ${faceColors[emotion]}cc`,
                    `0 0 72px 16px ${faceColors[emotion]}77`,
                  ]
                : [
                    `0 0 50px 10px ${faceColors[emotion]}66`,
                    `0 0 80px 20px ${faceColors[emotion]}aa`,
                    `0 0 50px 10px ${faceColors[emotion]}66`,
                  ],
            }}
            transition={{ duration: spiritReplyBg ? 3.2 : 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 overflow-hidden"
            style={{ filter: spiritReplyBg ? "blur(14px)" : "blur(12px)" }}
          >
            {/* Soft Ambient Blobs */}
            {/* Base white-ish background */}
            <div className="absolute inset-0 bg-[#f8fafc] z-0" />

            {/* Emotion-driven flowing Blob */}
            <motion.div
              animate={{
                x: spiritReplyBg ? ["-32%", "18%", "-32%"] : ["-20%", "10%", "-20%"],
                y: spiritReplyBg ? ["-16%", "28%", "-16%"] : ["-10%", "20%", "-10%"],
                scale: spiritReplyBg ? [1.05, 1.52, 1.05] : [1, 1.2, 1],
                rotate: spiritReplyBg ? [0, 110, 0] : [0, 90, 0],
                background: `radial-gradient(circle, ${faceColors[emotion]} 0%, transparent 70%)`,
              }}
              transition={{
                x: { duration: spiritReplyBg ? 4.8 : 10, repeat: Infinity, ease: "easeInOut" },
                y: { duration: spiritReplyBg ? 4.8 : 10, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: spiritReplyBg ? 4.8 : 10, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: spiritReplyBg ? 4.8 : 10, repeat: Infinity, ease: "easeInOut" },
                background: { duration: 0.8 },
              }}
              className={
                spiritReplyBg
                  ? "absolute w-[185%] h-[185%] top-[-26%] left-[-26%] opacity-95 blur-2xl rounded-full z-0"
                  : "absolute w-[150%] h-[150%] top-[-20%] left-[-20%] opacity-90 blur-2xl rounded-full z-0"
              }
            />

            {/* Flowing Green Blob (constant element like a sprite) */}
            <motion.div
              animate={{
                x: spiritReplyBg ? ["14%", "-28%", "14%"] : ["10%", "-20%", "10%"],
                y: spiritReplyBg ? ["14%", "-22%", "14%"] : ["10%", "-15%", "10%"],
                scale: spiritReplyBg ? [1.05, 1.48, 1.05] : [1, 1.3, 1],
                rotate: spiritReplyBg ? [0, -110, 0] : [0, -90, 0],
              }}
              transition={{ duration: spiritReplyBg ? 5.5 : 12, repeat: Infinity, ease: "easeInOut" }}
              className={
                spiritReplyBg
                  ? "absolute w-[158%] h-[158%] top-[-4%] left-[6%] opacity-80 blur-2xl rounded-full z-0"
                  : "absolute w-[120%] h-[120%] top-[0%] left-[10%] opacity-70 blur-2xl rounded-full z-0"
              }
              style={{ background: "radial-gradient(circle, #bbf7d0 0%, transparent 70%)" }}
            />

            {/* Small floating white highlights */}
            <motion.div
              animate={{
                opacity: spiritReplyBg ? [0.35, 0.95, 0.35] : [0.3, 0.8, 0.3],
                scale: spiritReplyBg ? [1, 1.85, 1] : [1, 1.5, 1],
                x: spiritReplyBg ? [0, 28, 0] : [0, 20, 0],
                y: spiritReplyBg ? [0, -28, 0] : [0, -20, 0],
              }}
              transition={{ duration: spiritReplyBg ? 2.4 : 4, repeat: Infinity, ease: "easeInOut" }}
              className={
                spiritReplyBg
                  ? "absolute w-24 h-24 bg-white rounded-full blur-xl top-[8%] left-[18%] z-0"
                  : "absolute w-20 h-20 bg-white rounded-full blur-xl top-[10%] left-[20%] z-0"
              }
            />
            <motion.div
              animate={{
                opacity: spiritReplyBg ? [0.25, 0.75, 0.25] : [0.2, 0.6, 0.2],
                scale: spiritReplyBg ? [1, 1.55, 1] : [1, 1.2, 1],
                x: spiritReplyBg ? [0, -22, 0] : [0, -15, 0],
                y: spiritReplyBg ? [0, 22, 0] : [0, 15, 0],
              }}
              transition={{
                duration: spiritReplyBg ? 2.9 : 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: spiritReplyBg ? 0.35 : 1,
              }}
              className={
                spiritReplyBg
                  ? "absolute w-28 h-28 bg-white rounded-full blur-xl bottom-[18%] right-[8%] z-0"
                  : "absolute w-24 h-24 bg-white rounded-full blur-xl bottom-[20%] right-[10%] z-0"
              }
            />
          </motion.div>

          {/* Clearer Boundary / Core Overlay (The "Membrane") */}
          <motion.div
            animate={{
              borderRadius: [
                "55% 45% 40% 60% / 60% 45% 55% 40%",
                "45% 55% 50% 50% / 50% 55% 45% 50%",
                "55% 45% 40% 60% / 60% 45% 55% 40%",
              ],
            }}
            transition={{ duration: spiritReplyBg ? 3.4 : 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[4%] z-0 border-[1.5px] border-white/50 backdrop-blur-[1px]"
            style={{
              background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 50%, transparent 80%)",
              boxShadow: "inset -10px -10px 30px rgba(0,0,0,0.1), inset 15px 15px 30px rgba(255,255,255,0.6), 0 0 15px rgba(255,255,255,0.3)"
            }}
          />

            {/* Crisp Facial Features Layer (Unblurred) */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Listening Voice Equalizer (Mouth Area) */}
            <motion.div
              animate={{ 
                opacity: emotion === 'listening' ? 1 : 0, 
              }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-[22%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 h-8 z-20 pointer-events-none"
            >
              {[
                [0.3, 0.7, 0.4, 0.8, 0.3],
                [0.5, 1.0, 0.6, 0.4, 0.5],
                [0.8, 0.4, 1.0, 0.5, 0.8],
                [0.4, 0.7, 0.5, 0.9, 0.4],
                [0.3, 0.5, 0.8, 0.4, 0.3]
              ].map((keyframes, i) => (
                <motion.div
                  key={`eq-bar-${i}`}
                  animate={
                    emotion === 'listening' 
                      ? { scaleY: keyframes }
                      : { scaleY: 0.2 }
                  }
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: i * 0.1 
                  }}
                  className="w-1.5 h-full bg-emerald-600 rounded-full origin-center"
                />
              ))}
            </motion.div>

            {/* Thinking Symbol */}
            <motion.div
              animate={{ 
                opacity: emotion === 'thinking' ? 1 : 0,
                scale: emotion === 'thinking' ? 1 : 0.5,
              }}
              transition={{ duration: 0.4 }}
              className="absolute top-[-5%] right-[5%] z-20"
            >
              <div className="relative">
                {/* Chat Bubble / Cloud shape (Simplified as an ellipses layout) */}
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white flex gap-1.5 items-center justify-center">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={`dot-${i}`}
                      animate={{ y: emotion === 'thinking' ? [0, -4, 0] : 0, opacity: emotion === 'thinking' ? [0.4, 1, 0.4] : 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                      className="w-2.5 h-2.5 rounded-full bg-slate-700"
                    />
                  ))}
                </div>
                {/* Tail of the bubble */}
                <div className="absolute -bottom-2.5 left-2 w-3.5 h-3.5 bg-white/80 rounded-full shadow-sm" />
                <div className="absolute -bottom-5 left-[2px] w-1.5 h-1.5 bg-white/80 rounded-full shadow-sm" />
              </div>
            </motion.div>

            {/* Anger Symbol */}
            <motion.div
              animate={{ 
                opacity: emotion === 'angry' ? 0.8 : 0, 
                scale: emotion === 'angry' ? [0.9, 1.1, 0.9] : 0.5,
                rotate: emotion === 'angry' ? [0, 5, -5, 0] : 0
              }}
              transition={{ 
                opacity: { duration: 0.3 }, 
                scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 0.75, repeat: Infinity, ease: "linear" }
              }}
              className="absolute top-[8%] right-[15%] w-14 h-14 z-20 text-red-700 drop-shadow-sm origin-center"
            >
              <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round">
                <path d="M 15 35 Q 35 35 35 15" />
                <path d="M 85 35 Q 65 35 65 15" />
                <path d="M 85 65 Q 65 65 65 85" />
                <path d="M 15 65 Q 35 65 35 85" />
              </svg>
            </motion.div>

            {/* Eyebrows */}
            <motion.div
              variants={leftEyebrowVariants}
              initial="neutral"
              animate={emotion}
              className="absolute top-[18%] left-[22%] w-14 h-3 rounded-full bg-slate-900/85 mix-blend-multiply z-10"
            />
            <motion.div
              variants={rightEyebrowVariants}
              initial="neutral"
              animate={emotion}
              className="absolute top-[18%] right-[22%] w-14 h-3 rounded-full bg-slate-900/85 mix-blend-multiply z-10"
            />

            {/* Eyes container */}
            <div className="absolute top-[28%] w-full h-24 flex justify-between px-[25%] z-10 items-center">
              <motion.div
                variants={leftEyeVariants}
                initial="neutral"
                animate={emotion}
                className="bg-gradient-to-br from-indigo-700 via-slate-900 to-black origin-center relative overflow-hidden shadow-[inset_-2px_-2px_10px_rgba(0,0,0,0.5),_0_0_15px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/30"
              >
                <div className="absolute top-[18%] left-[25%] w-[35%] h-[35%] bg-white rounded-full opacity-70 blur-[1px]"></div>
                <div className="absolute top-[55%] left-[65%] w-[18%] h-[18%] bg-white rounded-full opacity-30 blur-[0.5px]"></div>
              </motion.div>
              <motion.div
                variants={rightEyeVariants}
                initial="neutral"
                animate={emotion}
                className="bg-gradient-to-br from-indigo-700 via-slate-900 to-black origin-center relative overflow-hidden shadow-[inset_-2px_-2px_10px_rgba(0,0,0,0.5),_0_0_15px_rgba(99,102,241,0.5)] ring-1 ring-indigo-500/30"
              >
                <div className="absolute top-[18%] left-[25%] w-[35%] h-[35%] bg-white rounded-full opacity-70 blur-[1px]"></div>
                <div className="absolute top-[55%] left-[65%] w-[18%] h-[18%] bg-white rounded-full opacity-30 blur-[0.5px]"></div>
              </motion.div>
            </div>

            {/* Blush (Cheeks) */}
            <motion.div
              animate={{ opacity: (emotion === 'shy' || emotion === 'happy') ? 0.6 : 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-[42%] left-[15%] w-12 h-6 rounded-full bg-rose-500 blur-md z-0"
            />
            <motion.div
              animate={{ opacity: (emotion === 'shy' || emotion === 'happy') ? 0.6 : 0 }}
              transition={{ duration: 0.4 }}
              className="absolute top-[42%] right-[15%] w-12 h-6 rounded-full bg-rose-500 blur-md z-0"
            />

            {/* Laptop / Monitor for Working State */}
            <motion.div
              animate={{ 
                opacity: emotion === 'working' ? 1 : 0, 
                x: emotion === 'working' ? 0 : -30,
                rotateY: emotion === 'working' ? 35 : 0,
                rotate: emotion === 'working' ? -5 : 0,
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute bottom-[-2%] left-[0%] text-slate-800 z-30 drop-shadow-2xl origin-bottom-right transform-gpu"
              style={{ perspective: 500 }}
            >
              <Laptop size={130} strokeWidth={1.5} fill="#94a3b8" />
            </motion.div>
          </div>
            </motion.div>
          </div>

          {wordFlashcard ? (
            <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
              <AnimatePresence mode="wait">
                <WordFlashCard
                  key={`${wordFlashcard.primary_text}-${wordFlashcard.secondary_text}`}
                  {...wordFlashcard}
                  onDismiss={() => setWordFlashcard(null)}
                  onReadAloud={readFlashcardAgain}
                  readAloudDisabled={!isMicOn}
                />
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      {flashcardDebugUi && (
        <div className="fixed top-20 right-3 z-[100] w-[min(22rem,calc(100vw-1.5rem))] max-h-[55vh] overflow-hidden rounded-xl border border-emerald-500/40 bg-slate-950/95 text-left shadow-2xl backdrop-blur-md">
          <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-emerald-300">
            闪卡调试 <span className="font-normal text-slate-500">(?debug=flashcard)</span>
          </div>
          <div className="max-h-[42vh] overflow-y-auto px-3 py-2 font-mono text-[10px] leading-snug text-slate-300 space-y-2">
            <div>
              <span className="text-slate-500">wordFlashcard:</span>{" "}
              <span className="break-all text-amber-200/95">
                {wordFlashcard ? JSON.stringify(wordFlashcard) : "null"}
              </span>
            </div>
            <div>
              <span className="text-slate-500">isMicOn:</span> {String(isMicOn)}
            </div>
            <div className="text-slate-500">最近 WS 事件（含 function/output 时附片段）:</div>
            <ul className="list-none space-y-0.5 pl-0 text-[9px] text-slate-400">
              {wsDebugRing.length === 0 ? (
                <li>（尚无；请开麦对话）</li>
              ) : (
                wsDebugRing.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`} className="break-all">
                    {line}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-3 py-2">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] text-white hover:bg-emerald-500"
              onClick={() =>
                setWordFlashcard({
                  primary_text: "debug",
                  secondary_text: "若能看到此卡，说明 UI 正常，问题在 WS/工具链",
                  primary_lang: "en",
                  secondary_lang: "zh",
                })
              }
            >
              注入测试闪卡
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-600"
              onClick={() => setWsDebugRing([])}
            >
              清空日志
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700"
              onClick={() => {
                localStorage.removeItem("FLASHCARD_DEBUG");
                setFlashcardDebugUi(false);
                setWsDebugRing([]);
              }}
            >
              关闭面板
            </button>
          </div>
        </div>
      )}

      {/* Video Preview */}
      {isCameraOn && (
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="fixed bottom-32 left-8 z-40 w-48 h-32 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 pointer-events-none"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        </motion.div>
      )}

      {/* Mic, Camera & Transcript */}
      <div className="fixed bottom-8 left-8 z-50 flex items-end gap-4">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`p-3 rounded-full shadow-lg transition-colors flex items-center justify-center relative ${
              isCameraOn ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-slate-300 text-slate-600 hover:bg-slate-400'
            }`}
            title={isCameraOn ? "关闭摄像头" : "开启摄像头"}
          >
            {isCameraOn ? <Camera size={24} /> : <CameraOff size={24} />}
          </button>

          {isCameraOn && isMicOn && (
            <button
              type="button"
              onClick={() => runVisionManualRef.current?.()}
              className="p-3 rounded-full shadow-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center"
              title="拍一张当前画面给 AI（也可直接说「看一下」「能看见我吗」等触发，按需计费）"
            >
              <Eye size={22} />
            </button>
          )}

          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-full shadow-lg transition-colors flex items-center justify-center relative ${
              isMicOn ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-300 text-slate-600 hover:bg-slate-400'
            }`}
            title={isMicOn ? "关闭麦克风" : "开启麦克风"}
          >
            {isMicOn ? (
              <div className="relative flex items-center justify-center w-7 h-7">
                {emotion === 'listening' ? (
                  <div className="flex items-center justify-center gap-0.5 h-full">
                    {[
                      [0.4, 0.8, 0.4, 1.0, 0.4],
                      [0.6, 1.0, 0.5, 0.4, 0.6],
                      [1.0, 0.4, 0.9, 0.5, 1.0],
                      [0.5, 0.8, 0.4, 0.9, 0.5],
                      [0.4, 0.6, 1.0, 0.4, 0.4]
                    ].map((keyframes, i) => (
                      <motion.div
                        key={`mic-eq-${i}`}
                        animate={{ scaleY: keyframes }}
                        transition={{ 
                          duration: 1.0, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          delay: i * 0.1 
                        }}
                        className="w-1 h-5 bg-white rounded-full origin-center"
                      />
                    ))}
                  </div>
                ) : (
                  <Mic size={28} />
                )}
              </div>
            ) : (
              <MicOff size={28} />
            )}
          </button>
        </div>

        {transcript && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/10 max-w-md text-white"
          >
            {transcript}
          </motion.div>
        )}
      </div>
    </div>
  );
}
