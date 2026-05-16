import type { WordFlashcardPayload } from "../flashcard/types";

export type StudyModeId = "flashcard" | "short_phrase" | "long_phrase" | "dialogue";

export type ShortPhraseCardData = {
  target_text: string;
  native_text?: string;
};

export type LongPhraseCardData = {
  target_text: string;
  native_text?: string;
};

export type DialogueTurn = {
  speaker: string;
  line: string;
  native?: string;
};

export type DialogueSceneData = {
  title?: string;
  turns: DialogueTurn[];
};

/** 右侧学习内容（与当前选中的学习 Tab 对应展示） */
export type StudyPanelPayload =
  | { mode: "flashcard"; data: WordFlashcardPayload }
  | { mode: "short_phrase"; data: ShortPhraseCardData }
  | { mode: "long_phrase"; data: LongPhraseCardData }
  | { mode: "dialogue"; data: DialogueSceneData };
