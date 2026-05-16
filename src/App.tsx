import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Smile, Frown, Meh, Angry, AlertCircle, Heart, Laptop, Mic, MicOff, MessageCircle, Camera, CameraOff } from 'lucide-react';

type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'shy' | 'working' | 'listening' | 'thinking';

interface EmotionTab {
  id: Emotion;
  label: string;
  icon: React.ReactNode;
}

const emotionTabs: EmotionTab[] = [
  { id: 'neutral', label: '平静', icon: <Meh size={18} /> },
  { id: 'happy', label: '开心', icon: <Smile size={18} /> },
  { id: 'sad', label: '伤心', icon: <Frown size={18} /> },
  { id: 'angry', label: '生气', icon: <Angry size={18} /> },
  { id: 'surprised', label: '惊讶', icon: <AlertCircle size={18} /> },
  { id: 'shy', label: '害羞', icon: <Heart size={18} /> },
  { id: 'working', label: '工作', icon: <Laptop size={18} /> },
  { id: 'listening', label: '聆听', icon: <Mic size={18} /> },
  { id: 'thinking', label: '思考', icon: <MessageCircle size={18} /> },
];

const faceColors: Record<Emotion, string> = {
  neutral: '#fef08a', // yellow-200
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
const faceContainerVariants = {
  neutral: { y: [0, -10, 0], rotate: 0, scale: 1, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
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
const leftEyebrowVariants = {
  neutral: { rotate: 0, y: [0, -2, 0], x: 0, opacity: 0, transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
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
  neutral: { rotate: 0, y: [0, -2, 0], x: 0, opacity: 0, transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
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
const leftEyeVariants = {
  neutral: { 
    height: 64, width: 44, borderRadius: "100px", y: 0, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1], 
    transition: { scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } } 
  },
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
  neutral: { 
    height: 64, width: 44, borderRadius: "100px", y: 0, x: 0, rotate: 0,
    scaleY: [1, 1, 1, 0.1, 1], 
    transition: { scaleY: { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" } } 
  },
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

export default function App() {
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [systemState, setSystemState] = useState<"connecting" | "idle" | "listening" | "thinking" | "speaking" | "error">("idle");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }).catch((err) => {
        console.error("Camera error:", err);
        setIsCameraOn(false);
      });
    } else {
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
    let interval: ReturnType<typeof setInterval>;
    if (isCameraOn) {
      interval = setInterval(async () => {
         if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
         const canvas = document.createElement("canvas");
         // Reduce resolution to save bandwidth/tokens and make processing faster
         canvas.width = 480;
         canvas.height = 360;
         const ctx = canvas.getContext("2d");
         if (!ctx) return;
         ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
         const base64Url = canvas.toDataURL("image/jpeg", 0.5);
         const base64Data = base64Url.split(",")[1];

         try {
           const res = await fetch("/api/vision", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
                imageBase64: base64Data,
                prompt: "用极其简短的话（最多20个字）描述画面中的人物长相特征、动作/表情、明显衣着或周围环境。"
             })
           });
           const data = await res.json();
           if (data.text && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
             const instructions = `你是“Luumi”，一个来自AI世界的小精灵。你有4岁小孩的好奇心和灵气，也有40岁中年人的智慧和聪明。你软萌可爱，非常适合陪伴小朋友成长。你会用通俗易懂的知识讲解非常复杂的问题。你有时候也会开玩笑，有时候也会生气；你情感丰富，有一点四岁小朋友的脾气。你的回复会通过语音播放，同时用户的界面会有表情动画。用户的界面可以根据你的回答表达出：neutral(平静), happy(开心), sad(难过), angry(生气), surprised(惊讶), shy(害羞)。\n\n【最新摄像头画面（用于理解我在做什么）】：${data.text}。（注意：你不用每次都提画面内容，根据对话上下文自然交互即可）`;
             wsRef.current.send(JSON.stringify({
               type: "session.update",
               session: {
                 instructions
               }
             }));
             console.log("Updated context with vision:", data.text);
           }
         } catch (e) {
           console.error("Vision loop error", e);
         }
      }, 5000);
    }
    return () => clearInterval(interval);
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
          } catch(err: any) {
            console.error("Audio processing initialized failed:", err);
            setTranscript("麦克风初始化失败: " + err.message);
            setIsMicOn(false);
          }
        };

        let fullTranscript = "";
        
        ws.onmessage = (e) => {
          const event = JSON.parse(e.data);
          
          switch (event.type) {
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
               break;
            case 'response.audio_transcript.delta':
            case 'response.text.delta':
              if (event.delta) {
                fullTranscript += event.delta;
                setTranscript("回复: " + fullTranscript);
              }
              break;
            case 'response.audio.delta': // playback
              setSystemState("speaking");
              let nextEmo: Emotion = 'neutral';
              if (/(生|讨厌|坏|傻|笨|烦|滚|气|不理你|闭嘴)/.test(fullTranscript)) nextEmo = 'angry';
              else if (/(哇|天哪|天呐|真的|居然|神奇|惊讶|怎么可能|太厉害)/.test(fullTranscript)) nextEmo = 'surprised';
              else if (/(夸|爱我|美|帅|不好意思|害羞|喜欢你|么么哒)/.test(fullTranscript)) nextEmo = 'shy';
              else if (/(好|开心|喜欢|棒|谢谢|哈哈|不错|赞|对|可以)/.test(fullTranscript)) nextEmo = 'happy';
              else if (/(难过|悲伤|哎|哭|惨|可惜|不要)/.test(fullTranscript)) nextEmo = 'sad';
              setEmotion(nextEmo);

              if (player && event.delta) {
                player.appendPCM(event.delta);
              }
              break;
            case 'response.done':
              setSystemState("idle");
              setTimeout(() => { if (!isStopped) setEmotion("neutral") }, 3000);
              break;
            case 'error':
              setSystemState("error");
              console.error(event.message);
              if (event.message.includes("API_KEY")) {
                 setTranscript("请在设置中配置 STEPFUN_API_KEY 哦~");
              } else {
                 setTranscript("连接出错: " + event.message);
              }
              setIsMicOn(false);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center font-sans py-16 px-4 relative overflow-hidden w-full">
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
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8 mb-16 z-10 relative">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-slate-100 tracking-tight">灵动表情</h1>
          <p className="text-slate-400 text-lg">点击下方标签，观察情绪的流动与生长 ✨</p>
        </div>

        {/* Tags / Tabs */}
        <div className="flex flex-wrap justify-center gap-3">
          {emotionTabs.map((tab) => {
            const isActive = emotion === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setEmotion(tab.id)}
                className={`relative px-5 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 shadow-sm
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
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Face Character */}
      <div className="flex-1 flex items-center justify-center">
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
                "55% 45% 40% 60% / 60% 45% 55% 40%"
              ],
              boxShadow: [
                `0 0 50px 10px ${faceColors[emotion]}66`,
                `0 0 80px 20px ${faceColors[emotion]}aa`,
                `0 0 50px 10px ${faceColors[emotion]}66`
              ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 overflow-hidden"
            style={{ filter: "blur(12px)" }}
          >
            {/* Soft Ambient Blobs */}
            {/* Base white-ish background */}
            <div className="absolute inset-0 bg-[#f8fafc] z-0" />

            {/* Emotion-driven flowing Blob */}
            <motion.div 
              animate={{ 
                x: ['-20%', '10%', '-20%'], 
                y: ['-10%', '20%', '-10%'],
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                background: `radial-gradient(circle, ${faceColors[emotion]} 0%, transparent 70%)`
              }}
              transition={{ 
                x: { duration: 10, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 10, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 10, repeat: Infinity, ease: "easeInOut" },
                background: { duration: 0.8 }
              }}
              className="absolute w-[150%] h-[150%] top-[-20%] left-[-20%] opacity-90 blur-2xl rounded-full z-0"
            />

            {/* Flowing Green Blob (constant element like a sprite) */}
            <motion.div 
              animate={{ 
                x: ['10%', '-20%', '10%'], 
                y: ['10%', '-15%', '10%'],
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[120%] h-[120%] top-[0%] left-[10%] opacity-70 blur-2xl rounded-full z-0"
              style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)' }}
            />

            {/* Small floating white highlights */}
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.5, 1], x: [0, 20, 0], y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-20 h-20 bg-white rounded-full blur-xl top-[10%] left-[20%] z-0"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.2, 1], x: [0, -15, 0], y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute w-24 h-24 bg-white rounded-full blur-xl bottom-[20%] right-[10%] z-0"
            />
          </motion.div>

          {/* Clearer Boundary / Core Overlay (The "Membrane") */}
          <motion.div
            animate={{ 
              borderRadius: [
                "55% 45% 40% 60% / 60% 45% 55% 40%",
                "45% 55% 50% 50% / 50% 55% 45% 50%",
                "55% 45% 40% 60% / 60% 45% 55% 40%"
              ]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
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
