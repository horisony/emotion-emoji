import type { StudyModeId, StudyPanelPayload } from "./types";
import { studyModeFocusUserText } from "./registry";

/** Tab 点击：通知模型当前学习模式，并请求一轮回复以驱动工具调用 */
export function requestStudyModeFocus(ws: WebSocket, mode: StudyModeId): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: studyModeFocusUserText(mode) }],
      },
    })
  );
  ws.send(JSON.stringify({ type: "response.create" }));
}

/** 非闪卡：把右侧真实内容同步给模型（类比【界面状态｜闪卡】） */
export function studyPanelUiContextUserText(panel: StudyPanelPayload | null): string {
  if (!panel) {
    return "【界面状态｜学习面板】用户右侧学习区当前无结构化面板内容（或已清空）。";
  }
  if (panel.mode === "short_phrase") {
    const d = panel.data;
    return (
      "【界面状态｜短句】右侧短句面板当前展示：\n外语：" +
      d.target_text.trim() +
      (d.native_text ? "\n中文：" + d.native_text.trim() : "") +
      "\n带读、测验时以此为准。"
    );
  }
  if (panel.mode === "long_phrase") {
    const d = panel.data;
    return (
      "【界面状态｜长句】右侧长句面板当前展示：\n外语：\n" +
      d.target_text.trim() +
      (d.native_text ? "\n中文：\n" + d.native_text.trim() : "") +
      "\n带读、讲解时以此为准。"
    );
  }
  const d = panel.data;
  const lines = d.turns
    .map((t) => `${t.speaker}: ${t.line}${t.native ? "（" + t.native + "）" : ""}`)
    .join("\n");
  return (
    "【界面状态｜场景对话】右侧场景「" +
    (d.title?.trim() || "对话") +
    "」当前台词：\n" +
    lines +
    "\n角色扮演与纠错时以此为准。"
  );
}

export function sendStudyPanelUiToRealtimeConversation(ws: WebSocket, panel: StudyPanelPayload | null): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (panel?.mode === "flashcard") return;
  ws.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: studyPanelUiContextUserText(panel) }],
      },
    })
  );
}
