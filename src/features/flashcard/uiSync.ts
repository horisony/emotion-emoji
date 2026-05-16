import type { WordFlashcardPayload } from "./types";
import { FLASHCARD_ORAL_PACING_RULE_ZH } from "./oralPacing";

/** 用于去重：同一张卡不重复往会话里塞 */
export function flashcardUiContextKey(card: WordFlashcardPayload | null): string {
  if (!card) return "__closed__";
  return `${card.primary_text.trim()}\x00${card.secondary_text.trim()}\x00${(card.phonetic ?? "").trim()}`;
}

export function flashcardUiContextUserText(card: WordFlashcardPayload | null): string {
  if (!card) {
    return (
      "【界面状态｜闪卡】用户已收起右侧单词闪卡，当前界面上没有闪卡。" +
      "若用户要你带读某个词，请先调用 show_word_flashcard 出卡，或请用户先要一张闪卡。"
    );
  }
  const w = card;
  let t =
    "【界面状态｜闪卡】右侧正在展示的单词闪卡如下（与用户所见一致，为权威内容；跟读、测验、解释时均以此为准，不要改词）。**大字为外语词条（primary_text），小字为极简中文释义（secondary_text）**：\n" +
    `目标语（大字）：${w.primary_text.trim()}\n` +
    `释义：${w.secondary_text.trim()}`;
  if (w.phonetic?.trim()) t += `\n音标/注音：${w.phonetic.trim()}`;
  if (w.primary_lang?.trim()) t += `\n目标语语种：${w.primary_lang.trim()}`;
  if (w.secondary_lang?.trim()) t += `\n释义语种：${w.secondary_lang.trim()}`;
  t +=
    "\n当用户说「带我念」「跟读」「念一遍」「念这个」时，请按上述目标语与释义带读：" +
    FLASHCARD_ORAL_PACING_RULE_ZH;
  return t;
}

/** 仅追加会话上下文，不触发 response.create，避免打断当前语音 */
export function sendFlashcardUiToRealtimeConversation(ws: WebSocket, card: WordFlashcardPayload | null): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: flashcardUiContextUserText(card) }],
      },
    })
  );
}

/** 请求模型立刻口播当前闪卡（须配合 response.create；在会话较空闲时调用以免冲突） */
export function requestFlashcardReadAloud(ws: WebSocket, card: WordFlashcardPayload): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  const w = card.primary_text.trim();
  const s = card.secondary_text.trim();
  if (!w) return;
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "【系统｜闪卡朗读】闪卡已在用户屏幕显示。请只用口语依次朗读本卡的**外语目标语**与**中文释义**（各念两轮，自然留白）。" +
              FLASHCARD_ORAL_PACING_RULE_ZH +
              "目标语：" +
              w +
              "；释义：" +
              s +
              "。不要 JSON、花括号、工具名或英文字段名。",
          },
        ],
      },
    })
  );
  ws.send(JSON.stringify({ type: "response.create" }));
}

/** 用户点击闪卡「再听」：请把目标语与释义再朗读两轮（同首次节奏要求） */
export function requestFlashcardReadAgainTwice(ws: WebSocket, card: WordFlashcardPayload): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  const w = card.primary_text.trim();
  const s = card.secondary_text.trim();
  if (!w) return;
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "【系统｜闪卡朗读】用户点击了闪卡上的「再听一遍」按钮。请把本卡目标语与释义**再朗读两轮**（只听词本身，节奏与首次带读一致）。" +
              FLASHCARD_ORAL_PACING_RULE_ZH +
              "目标语：" +
              w +
              "；释义：" +
              s +
              "。不要 JSON、花括号、工具名或英文字段名。",
          },
        ],
      },
    })
  );
  ws.send(JSON.stringify({ type: "response.create" }));
}
