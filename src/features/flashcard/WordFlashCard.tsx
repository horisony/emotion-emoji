import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, ImageOff, X } from "lucide-react";
import type { WordFlashcardPayload } from "./types";

const WIKI_SUBDOMAIN: Record<string, string> = {
  en: "en",
  zh: "zh",
  "zh-cn": "zh",
  "zh-hans": "zh",
  ja: "ja",
  ko: "ko",
  fr: "fr",
  de: "de",
  es: "es",
  ru: "ru",
  pt: "pt",
  it: "it",
};

function wikiHost(lang: string | undefined): string {
  const key = (lang || "en").toLowerCase().split("-")[0] || "en";
  return `${WIKI_SUBDOMAIN[key] ?? "en"}.wikipedia.org`;
}

async function fetchWikipediaThumb(
  title: string,
  wikiLang: string | undefined
): Promise<string | null> {
  const q = title.trim();
  if (!q) return null;
  const host = wikiHost(wikiLang);
  const url = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    const src = data.thumbnail?.source;
    return typeof src === "string" && src.startsWith("http") ? src : null;
  } catch {
    return null;
  }
}

export interface WordFlashCardProps extends WordFlashcardPayload {
  onDismiss?: () => void;
}

export function WordFlashCard({
  primary_text,
  secondary_text,
  primary_lang,
  secondary_lang,
  image_search_query,
  phonetic,
  onDismiss,
}: WordFlashCardProps) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const query = (image_search_query || primary_text).trim();
  const primaryLangAttr = primary_lang?.trim() || undefined;
  const secondaryLangAttr = secondary_lang?.trim() || undefined;

  useEffect(() => {
    let cancelled = false;
    setThumb(null);
    setThumbFailed(false);
    if (!query) return;

    const run = async () => {
      let src = await fetchWikipediaThumb(query, primary_lang);
      if (!src && primary_lang && primary_lang.toLowerCase().startsWith("zh") === false) {
        src = await fetchWikipediaThumb(query, "en");
      }
      if (!cancelled) {
        setThumb(src);
        if (!src) setThumbFailed(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [query, primary_lang]);

  const initial = primary_text.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="relative w-full max-w-md shrink-0"
    >
      <div
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
        style={{ minHeight: 360 }}
      >
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white/90 transition hover:bg-black/55 hover:text-white"
            title="收起闪卡"
            aria-label="收起闪卡"
          >
            <X size={18} />
          </button>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(129,140,248,0.22),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(52,211,153,0.12),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col p-5 pt-6">
          <div className="mb-4 flex items-center gap-2 text-indigo-200/90">
            <BookOpen size={18} strokeWidth={2} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Word flashcard</span>
          </div>

          <div className="relative mb-5 aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 shadow-inner">
            <AnimatePresence mode="wait">
              {thumb && !thumbFailed ? (
                <motion.img
                  key={thumb}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  src={thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setThumbFailed(true)}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-900/50 to-emerald-900/30"
                >
                  <span className="text-5xl font-black text-white/90 drop-shadow-lg">{initial}</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    {thumbFailed ? (
                      <>
                        <ImageOff size={14} /> 暂无配图
                      </>
                    ) : (
                      "配图加载中…"
                    )}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center px-1 pb-2">
            <h2
              lang={primaryLangAttr}
              className="w-full break-words text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md sm:text-5xl"
            >
              {primary_text.trim()}
            </h2>
            {phonetic?.trim() ? (
              <p className="mt-2 font-mono text-sm text-indigo-200/85">{phonetic.trim()}</p>
            ) : null}
            <p
              lang={secondaryLangAttr}
              className="mt-4 max-w-full break-words text-base font-medium leading-relaxed text-slate-300/95 sm:text-lg"
            >
              {secondary_text.trim()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
