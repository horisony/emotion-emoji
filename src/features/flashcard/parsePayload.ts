import type { WordFlashcardPayload } from "./types";

function countHan(s: string): number {
  return (s.match(/\p{Script=Han}/gu) ?? []).length;
}

function countLatinLetters(s: string): number {
  return (s.match(/[A-Za-z]/g) ?? []).length;
}

/** 小字仅保留最短释义：按标点截第一句，并限制长度，避免模型塞整段说明 */
function shortenSecondaryText(s: string): string {
  let t = s.trim();
  if (!t) return t;
  const delims = /[，,。！？!？；;：:]+/;
  if (delims.test(t)) {
    const first = t.split(delims)[0]?.trim() ?? t;
    if (first.length >= 1) t = first;
  }
  const max = 18;
  if (t.length > max) t = t.slice(0, max - 1) + "…";
  return t;
}

/**
 * 纠正常见字段反了的情况（大字中文、小字英文单词），并压缩过长小字。
 */
export function normalizeWordFlashcardPayload(p: WordFlashcardPayload): WordFlashcardPayload {
  let primary_text = p.primary_text.trim();
  let secondary_text = p.secondary_text.trim();
  let primary_lang = p.primary_lang?.trim() || undefined;
  let secondary_lang = p.secondary_lang?.trim() || undefined;

  const hanP = countHan(primary_text);
  const latP = countLatinLetters(primary_text);
  const hanS = countHan(secondary_text);
  const latS = countLatinLetters(secondary_text);

  /** 大字以汉字为主、小字以拉丁字母为主 → 多半是反了，交换 */
  const reversedEnZh =
    hanP >= 1 &&
    latS >= 2 &&
    latP <= 1 &&
    hanS <= latS;

  if (reversedEnZh) {
    [primary_text, secondary_text] = [secondary_text, primary_text];
    [primary_lang, secondary_lang] = [secondary_lang, primary_lang];
  }

  secondary_text = shortenSecondaryText(secondary_text);

  return {
    primary_text,
    secondary_text,
    primary_lang,
    secondary_lang,
    image_search_query: p.image_search_query?.trim() || undefined,
    phonetic: p.phonetic?.trim() || undefined,
  };
}

/**
 * 流式阶段可能在 JSON 尚未闭合时就收到 item.done / 片段 arguments。
 * 此时 parse 会失败，但**不能**把 call_id 记入 fulfilled，否则后续完整参数再也进不来。
 */
export function argsJsonLooksStreamIncomplete(trimmed: string): boolean {
  const t = trimmed.trim();
  if (!t || t === "{}") return true;
  if (!t.startsWith("{")) return false;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth < 0) return false;
    }
  }
  return inStr || depth !== 0;
}

export function parseWordFlashcardPayload(argsJson: string): WordFlashcardPayload | null {
  try {
    const raw = JSON.parse(argsJson || "{}") as Record<string, unknown>;
    const primary = String(raw.primary_text ?? "").trim();
    const secondary = String(raw.secondary_text ?? "").trim();
    if (!primary || !secondary) return null;
    return normalizeWordFlashcardPayload({
      primary_text: primary,
      secondary_text: secondary,
      primary_lang: raw.primary_lang != null ? String(raw.primary_lang).trim() : undefined,
      secondary_lang: raw.secondary_lang != null ? String(raw.secondary_lang).trim() : undefined,
      image_search_query:
        raw.image_search_query != null ? String(raw.image_search_query).trim() : undefined,
      phonetic: raw.phonetic != null ? String(raw.phonetic).trim() : undefined,
    });
  } catch {
    return null;
  }
}
