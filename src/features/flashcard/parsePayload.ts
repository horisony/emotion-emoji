import type { WordFlashcardPayload } from "./types";

export function parseWordFlashcardPayload(argsJson: string): WordFlashcardPayload | null {
  try {
    const raw = JSON.parse(argsJson || "{}") as Record<string, unknown>;
    const primary = String(raw.primary_text ?? "").trim();
    const secondary = String(raw.secondary_text ?? "").trim();
    if (!primary || !secondary) return null;
    return {
      primary_text: primary,
      secondary_text: secondary,
      primary_lang: raw.primary_lang != null ? String(raw.primary_lang).trim() : undefined,
      secondary_lang: raw.secondary_lang != null ? String(raw.secondary_lang).trim() : undefined,
      image_search_query:
        raw.image_search_query != null ? String(raw.image_search_query).trim() : undefined,
      phonetic: raw.phonetic != null ? String(raw.phonetic).trim() : undefined,
    };
  } catch {
    return null;
  }
}
