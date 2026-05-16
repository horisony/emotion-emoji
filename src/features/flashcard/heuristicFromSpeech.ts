import type { WordFlashcardPayload } from "./types";
import { normalizeWordFlashcardPayload } from "./parsePayload";

/** 常见中文主题 → 英文单词（儿童场景） */
const ZH_THEME_TO_EN: Record<string, string> = {
  猫: "cat",
  狗: "dog",
  鸟: "bird",
  鱼: "fish",
  苹果: "apple",
  水: "water",
  书: "book",
  车: "car",
  花: "flower",
  树: "tree",
  太阳: "sun",
  月亮: "moon",
  星星: "star",
  熊猫: "panda",
  老虎: "tiger",
  兔子: "rabbit",
  椅子: "chair",
  桌子: "desk",
  门: "door",
  窗: "window",
  学校: "school",
  朋友: "friend",
  家: "home",
  妈妈: "mom",
  爸爸: "dad",
  老师: "teacher",
  学生: "student",
  笔: "pen",
};

/**
 * 从「…猫的闪卡」「展示熊猫的闪卡」等中文里抽主题，生成兜底闪卡（仅词表命中时；模型未调工具且无转写 JSON 时由 response.done 使用）。
 */
export function heuristicFlashcardFromUserChinese(text: string): WordFlashcardPayload | null {
  const compact = text.replace(/\s/g, "");
  /** 「猫的闪卡」「猫闪卡」等；「的」可省，避免 ASR 吞字 */
  const m = compact.match(/([\u4e00-\u9fff]{1,8})的?闪卡/);
  if (m) {
    const zhTheme = m[1];
    const en = ZH_THEME_TO_EN[zhTheme];
    if (en) {
      return normalizeWordFlashcardPayload({
        primary_text: en,
        secondary_text: zhTheme,
        primary_lang: "en",
        secondary_lang: "zh",
        image_search_query: en,
      });
    }
    /** 无内置映射时不造占位卡，避免盖住模型随后给出的正确闪卡 */
    return null;
  }
  return null;
}
