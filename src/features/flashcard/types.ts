export interface WordFlashcardPayload {
  /** 目标语言大字：单词或短语 */
  primary_text: string;
  /** 辅助语言小字：翻译 / 释义 */
  secondary_text: string;
  /** BCP-47，如 en、ja，用于 lang 与维基子域 */
  primary_lang?: string;
  secondary_lang?: string;
  /** 维基摘要缩略图查询用语（可选，缺省用 primary_text） */
  image_search_query?: string;
  /** 音标或注音，可选一行小字 */
  phonetic?: string;
}
