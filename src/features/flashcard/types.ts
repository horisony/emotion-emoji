export interface WordFlashcardPayload {
  /** 大字：要学的外语单词或短语（学英文时为英文） */
  primary_text: string;
  /** 小字：极简中文释义 / 翻译（勿整句） */
  secondary_text: string;
  /** BCP-47，如 en、ja，用于 lang 与维基子域 */
  primary_lang?: string;
  secondary_lang?: string;
  /** 维基摘要缩略图查询用语（可选，缺省用 primary_text） */
  image_search_query?: string;
  /** 音标或注音，可选一行小字 */
  phonetic?: string;
}
