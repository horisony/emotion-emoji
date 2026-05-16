import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageSquare, TextQuote, Users } from "lucide-react";
import { WordFlashCard } from "../flashcard/WordFlashCard";
import type { WordFlashcardPayload } from "../flashcard/types";
import type { StudyModeId, StudyPanelPayload } from "./types";

function Placeholder(props: { title: string; hint: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-[280px] w-full max-w-md flex-col justify-center rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 text-center shadow-xl backdrop-blur-md">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
        {props.icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-100">{props.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{props.hint}</p>
    </div>
  );
}

export function RightStudyPanel(props: {
  activeMode: StudyModeId | null;
  panel: StudyPanelPayload | null;
  isMicOn: boolean;
  onDismissFlashcard: () => void;
  onReadFlashcardAgain: () => void;
  onClearNonFlashcard: () => void;
}) {
  const { activeMode, panel, isMicOn, onDismissFlashcard, onReadFlashcardAgain, onClearNonFlashcard } = props;

  if (!activeMode) return null;

  if (activeMode === "flashcard") {
    const card: WordFlashcardPayload | null = panel?.mode === "flashcard" ? panel.data : null;
    if (card) {
      return (
        <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
          <AnimatePresence mode="wait">
            <WordFlashCard
              key={`${card.primary_text}-${card.secondary_text}`}
              {...card}
              onDismiss={onDismissFlashcard}
              onReadAloud={onReadFlashcardAgain}
              readAloudDisabled={!isMicOn}
            />
          </AnimatePresence>
        </div>
      );
    }
    return (
      <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
        <Placeholder
          title="单词闪卡"
          hint="开麦后说出想学的词，或请 Luumi 展示闪卡；模型会调用工具在右侧出卡。"
          icon={<TextQuote className="h-6 w-6" />}
        />
      </div>
    );
  }

  if (activeMode === "short_phrase") {
    if (panel?.mode === "short_phrase") {
      const d = panel.data;
      return (
        <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-400">短句</div>
            <p className="text-xl font-semibold leading-snug text-slate-50">{d.target_text}</p>
            {d.native_text ? <p className="mt-3 text-base text-slate-400">{d.native_text}</p> : null}
            <button
              type="button"
              onClick={onClearNonFlashcard}
              className="mt-6 text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            >
              清空本面板
            </button>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
        <Placeholder
          title="短句练习"
          hint="已切换到短句模式。用语音说出主题，或等 Luumi 调用工具在右侧展示例句。"
          icon={<MessageSquare className="h-6 w-6" />}
        />
      </div>
    );
  }

  if (activeMode === "long_phrase") {
    if (panel?.mode === "long_phrase") {
      const d = panel.data;
      return (
        <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md"
          >
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-400">长句</div>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-100">{d.target_text}</p>
            {d.native_text ? (
              <p className="mt-4 whitespace-pre-wrap border-t border-slate-700/80 pt-4 text-sm leading-relaxed text-slate-400">
                {d.native_text}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClearNonFlashcard}
              className="mt-6 text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            >
              清空本面板
            </button>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
        <Placeholder
          title="长句练习"
          hint="已切换到长句模式。描述想学的场景或句子类型，Luumi 会通过工具展示长句内容。"
          icon={<TextQuote className="h-6 w-6" />}
        />
      </div>
    );
  }

  if (activeMode === "dialogue") {
    const dialogueData = panel?.mode === "dialogue" ? panel.data : null;
    const hasTurns = Boolean(dialogueData && dialogueData.turns.length > 0);
    return (
      <div className="relative z-30 flex w-full min-w-0 shrink-0 justify-center sm:max-w-md md:justify-start md:pl-2 md:max-w-none">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md max-h-[min(72vh,560px)] overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md"
        >
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-fuchsia-400">场景对话</div>
          {dialogueData?.title ? (
            <h3 className="mb-4 border-b border-slate-700/80 pb-3 text-lg font-semibold text-slate-100">{dialogueData.title}</h3>
          ) : null}
          {hasTurns && dialogueData ? (
            <div className="space-y-3" aria-label="场景对话内容">
              {dialogueData.turns.map((t, i) => {
                const alignRight = i % 2 === 1;
                return (
                  <div key={`${t.speaker}-${i}-${t.line.slice(0, 24)}`} className={`flex ${alignRight ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[min(100%,22rem)] rounded-2xl px-4 py-3 ${
                        alignRight
                          ? "bg-fuchsia-950/50 border border-fuchsia-500/35 text-left"
                          : "bg-slate-800/95 border border-slate-600/45 text-left"
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-300/90">
                        {t.speaker}
                      </div>
                      <p className="mt-1.5 text-base font-medium leading-relaxed text-slate-50">{t.line}</p>
                      {t.native ? (
                        <p className="mt-2 border-t border-white/10 pt-2 text-sm leading-relaxed text-slate-400">{t.native}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600/55 bg-slate-950/50 px-4 py-8 text-center">
              <Users className="mb-3 h-9 w-9 text-slate-500" aria-hidden />
              <p className="text-sm leading-relaxed text-slate-400">
                对话将显示在此卡片中。请开麦描述场景（如咖啡店点餐），或等待 Luumi 调用工具写入多轮台词。
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onClearNonFlashcard}
            className="mt-6 text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
          >
            清空本面板
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
}
