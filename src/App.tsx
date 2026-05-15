import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Smile, Frown, Meh, Angry, AlertCircle, Heart } from 'lucide-react';

type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'shy';

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
];

const faceColors: Record<Emotion, string> = {
  neutral: '#fef08a', // yellow-200
  happy: '#fcd34d', // amber-300
  sad: '#bfdbfe', // blue-200
  angry: '#fecaca', // red-200
  surprised: '#e9d5ff', // purple-200
  shy: '#fbcfe8', // pink-200
};

// --- Container (Body) Motion Variants ---
const faceContainerVariants = {
  neutral: { y: [0, -10, 0], rotate: 0, scale: 1, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  happy: { y: [0, -25, 0], rotate: 0, scale: [1, 1.02, 1], transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
  sad: { y: [5, 15, 5], rotate: 0, scale: [1, 0.98, 1], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  angry: { y: [-2, 2, -2], x: [-3, 3, -3], rotate: 0, scale: 1.02, transition: { duration: 0.1, repeat: Infinity, ease: "linear" } },
  surprised: { y: [-15, -20, -15], rotate: 0, scale: 1, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  shy: { y: 0, rotate: [-4, 4, -4], x: [-6, 6, -6], scale: 1, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
};

// --- Left Eyebrow Variants ---
const leftEyebrowVariants = {
  neutral: { rotate: 0, y: [0, -2, 0], x: 0, opacity: 0, transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
  happy: { rotate: -10, y: [-10, -8, -10], x: 0, opacity: 0, transition: { y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } } },
  sad: { rotate: -15, y: [-5, -3, -5], x: 0, opacity: 1, transition: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  angry: { rotate: [25, 28, 25], y: 15, x: 5, opacity: 1, transition: { rotate: { duration: 0.1, repeat: Infinity, ease: "linear" } } },
  surprised: { rotate: -10, y: [-15, -18, -15], x: 0, opacity: 1, transition: { y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } },
  shy: { rotate: 0, y: 0, x: 0, opacity: 0 },
};

// --- Right Eyebrow Variants ---
const rightEyebrowVariants = {
  neutral: { rotate: 0, y: [0, -2, 0], x: 0, opacity: 0, transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } },
  happy: { rotate: 10, y: [-10, -8, -10], x: 0, opacity: 0, transition: { y: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } } },
  sad: { rotate: 15, y: [-5, -3, -5], x: 0, opacity: 1, transition: { y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } },
  angry: { rotate: [-25, -28, -25], y: 15, x: -5, opacity: 1, transition: { rotate: { duration: 0.1, repeat: Infinity, ease: "linear" } } },
  surprised: { rotate: 10, y: [-15, -18, -15], x: 0, opacity: 1, transition: { y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } } },
  shy: { rotate: 0, y: 0, x: 0, opacity: 0 },
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
};

export default function App() {
  const [emotion, setEmotion] = useState<Emotion>('neutral');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center font-sans py-16 px-4">
      {/* Header & Controls */}
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8 mb-16">
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
                className="bg-slate-900/85 mix-blend-multiply origin-center"
              />
              <motion.div
                variants={rightEyeVariants}
                initial="neutral"
                animate={emotion}
                className="bg-slate-900/85 mix-blend-multiply origin-center"
              />
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
