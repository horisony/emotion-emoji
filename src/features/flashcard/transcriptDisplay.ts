import type { WordFlashcardPayload } from "./types";
import { parseWordFlashcardPayload } from "./parsePayload";

/** 去掉 Markdown 代码块（模型常把 JSON 写在 ```json ``` 里） */
function stripCodeFences(s: string): string {
  return s.replace(/```(?:json|JSON|typescript|ts|js)?\s*[\s\S]*?```/g, " ");
}

/**
 * 从流式文本里摘掉「整段合法闪卡 JSON」；若解析成功则返回 payload，供界面兜底展示。
 * 仅在括号平衡且 JSON.parse 成功且含 primary_text/secondary_text 时移除，避免半截 JSON 乱跳。
 */
export function scrubTranscriptAndPullFlashcard(text: string): {
  text: string;
  pulled: WordFlashcardPayload | null;
} {
  let s = stripCodeFences(text);
  let pulled: WordFlashcardPayload | null = null;
  for (let round = 0; round < 5; round++) {
    const hit = extractOneFlashcardJson(s);
    if (!hit) break;
    s = hit.before + hit.after;
    pulled = hit.payload;
  }
  /** 模型偶发把工具名漏到口播稿里 */
  s = s.replace(/\bshow_word_flashcard\b/gi, " ").replace(/\bfunction_call\b/gi, " ");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  return { text: s, pulled };
}

function extractOneFlashcardJson(s: string): {
  before: string;
  after: string;
  payload: WordFlashcardPayload;
} | null {
  const marker = '"primary_text"';
  let from = 0;
  while (from < s.length) {
    const idx = s.indexOf(marker, from);
    if (idx === -1) return null;
    const start = s.lastIndexOf("{", idx);
    if (start === -1) {
      from = idx + 1;
      continue;
    }
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          const jsonStr = s.slice(start, i + 1);
          const payload = parseWordFlashcardPayload(jsonStr);
          if (payload) {
            return {
              before: s.slice(0, start),
              after: s.slice(i + 1),
              payload,
            };
          }
          break;
        }
      }
    }
    from = idx + 1;
  }
  return null;
}
