import type { DialogueSceneData, LongPhraseCardData, ShortPhraseCardData } from "./types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function parseShortPhraseCardArgs(argumentsStr: string): ShortPhraseCardData | null {
  try {
    const j = JSON.parse(argumentsStr) as unknown;
    const o = asRecord(j);
    if (!o) return null;
    const target = String(o.target_text ?? "").trim();
    if (!target) return null;
    const native = String(o.native_text ?? "").trim();
    return { target_text: target, native_text: native || undefined };
  } catch {
    return null;
  }
}

export function parseLongPhraseCardArgs(argumentsStr: string): LongPhraseCardData | null {
  try {
    const j = JSON.parse(argumentsStr) as unknown;
    const o = asRecord(j);
    if (!o) return null;
    const target = String(o.target_text ?? "").trim();
    if (!target) return null;
    const native = String(o.native_text ?? "").trim();
    return { target_text: target, native_text: native || undefined };
  } catch {
    return null;
  }
}

function parseTurnsFromArray(arr: unknown): DialogueSceneData["turns"] {
  if (!Array.isArray(arr)) return [];
  const turns: DialogueSceneData["turns"] = [];
  for (const row of arr) {
    const r = asRecord(row);
    if (!r) continue;
    const speaker = String(r.speaker ?? r.role ?? "A").trim() || "A";
    const line = String(r.line ?? r.text ?? "").trim();
    if (!line) continue;
    const native = String(r.native ?? r.translation ?? "").trim();
    turns.push({ speaker, line, native: native || undefined });
  }
  return turns;
}

export function parseDialogueSceneArgs(argumentsStr: string): DialogueSceneData | null {
  try {
    const j = JSON.parse(argumentsStr) as unknown;
    const o = asRecord(j);
    if (!o) return null;
    const titleRaw = o.title;
    const title = typeof titleRaw === "string" ? titleRaw.trim() : undefined;
    let turns: DialogueSceneData["turns"] = [];

    if (Array.isArray(o.turns)) {
      turns = parseTurnsFromArray(o.turns);
    } else {
      const turnsJson = o.turns_json;
      if (typeof turnsJson === "string" && turnsJson.trim()) {
        const arr = JSON.parse(turnsJson) as unknown;
        turns = parseTurnsFromArray(arr);
      }
    }
    if (turns.length === 0) return null;
    return { title: title || undefined, turns };
  } catch {
    return null;
  }
}
