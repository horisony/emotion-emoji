import { FLASHCARD_ORAL_PACING_RULE_ZH } from "../flashcard/oralPacing";
import type { StudyModeId } from "./types";

/** UI Tab 顺序与 id */
export const STUDY_MODE_TABS: ReadonlyArray<{ id: StudyModeId; label: string }> = [
  { id: "flashcard", label: "闪卡" },
  { id: "short_phrase", label: "短句" },
  { id: "long_phrase", label: "长句" },
  { id: "dialogue", label: "场景对话" },
] as const;

export const STUDY_TOOL_NAMES = {
  flashcard: "show_word_flashcard",
  short_phrase: "show_short_phrase_card",
  long_phrase: "show_long_phrase_card",
  dialogue: "show_dialogue_scene",
} as const;

const ORAL_REPEAT_HINT =
  "教短句/长句时请将外语句与中文对照各念两轮，自然留白；口播里严禁 JSON、花括号、代码块、英文字段名、工具名。";

/**
 * 追加到 Luumi 系统指令末尾：闪卡 + 三种学习面板规则（与 tools 一一对应）。
 */
export function buildStudyInstructionAppendix(): string {
  return (
    "【单词闪卡 show_word_flashcard】只要用户话里涉及：要看/玩/展示闪卡、闪卡游戏、「某某的闪卡」、「给我们展示一个…闪卡」、来一张单词卡等，都视为在要闪卡——**必须先调用** show_word_flashcard，右侧才会出真卡；**禁止**只答应不调工具。参数只在工具里填，**绝不**写进对用户说的内容里。**调用成功、卡片已在界面上之后**：你必须立刻口播卡片上的词；" +
    FLASHCARD_ORAL_PACING_RULE_ZH +
    "【闪卡版面｜勿填反】右侧 UI 固定为：**大字**= 工具参数 primary_text，必须是用户要学的**外语单词或短语**（学英文时必须是英文拼写，禁止把中文填在大字位）；**小字**= secondary_text，只能是**极简中文**（通常 2～8 个汉字的一个词或最短释义），禁止整句、禁止逗号后的补充说明、禁止提示语。日语、韩语等与中文组合时同理。用户只给事物名（如猫、苹果）时，按当前学的语种拆成单词填卡。口播里**严禁** JSON、花括号、代码块、英文字段名、工具名。与闪卡无关时不要调用。客户端会不定期插入以「【界面状态｜闪卡】」开头的说明，那是当前**用户屏幕上真实在显示**的闪卡内容（含从语音兜底解析出的卡），与之一致即可；带读、跟读时以该说明与工具参数为准。" +
    "【短句面板 show_short_phrase_card】用户要练短句、看一句常用口语、或界面已切到「短句」学习模式时，必须在右侧出面板前**先调用** show_short_phrase_card；禁止只描述不调工具。target_text=外语短句一行；native_text=中文对照（可选）。出面板后立刻口播：" +
    ORAL_REPEAT_HINT +
    "【长句面板 show_long_phrase_card】用户要长句、段落朗读、复杂表达时，**先调用** show_long_phrase_card；target_text=外语长句或小段；native_text=中文对照（可选）。出面板后分段自然口播，同样禁止念 JSON 或字段名。" +
    "【场景对话 show_dialogue_scene】用户要情景对话、角色扮演对话、场景英语时，**先调用** show_dialogue_scene；title=场景标题（可选）；台词二选一：**turns**=JSON 数组（推荐），每项含 speaker、line、可选 native；或 **turns_json**=上述数组的 JSON 字符串。禁止把整段对话只写在口播里而不调工具。" +
    "客户端会插入「【学习模式｜…】」类说明表示用户当前选中的学习 Tab；请优先用对应工具更新右侧内容。"
  );
}

type OpenAIToolFunction = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** 与 session.update 对齐的学习类 function tools（不含 look_at_camera） */
export function buildStudyTools(): OpenAIToolFunction[] {
  return [
    {
      type: "function",
      function: {
        name: STUDY_TOOL_NAMES.flashcard,
        description:
          "用户话里只要涉及要看/玩/展示闪卡、闪卡游戏、某物的闪卡、来张单词卡等，就应调用：在右侧显示闪卡。大字 primary_text=外语单词（学英文时填英文），小字 secondary_text=极短中文词义（勿整句）；出卡后口播：" +
          FLASHCARD_ORAL_PACING_RULE_ZH +
          "勿把字段名或 JSON 念给用户。",
        parameters: {
          type: "object",
          properties: {
            primary_text: {
              type: "string",
              description: "卡片大字：要学的外语单词/短语（学英文时必须是英文拼写，勿填中文整句）。",
            },
            secondary_text: {
              type: "string",
              description: "卡片小字：极简中文释义（通常 2～8 个汉字，仅词义；禁止整句、禁止补充说明）。",
            },
            primary_lang: { type: "string", description: "目标语言 BCP-47，如 en、ja、ko" },
            secondary_lang: { type: "string", description: "释义语言 BCP-47，如 zh" },
            image_search_query: {
              type: "string",
              description: "可选：维基摘要配图检索用词，缺省用 primary_text",
            },
            phonetic: { type: "string", description: "可选：音标或注音一行" },
          },
          required: ["primary_text", "secondary_text"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: STUDY_TOOL_NAMES.short_phrase,
        description:
          "在右侧展示一条外语短句及可选中文对照；用户切换到短句模式或口头要短句练习时调用。出面板后口播外语与中文各两轮。" + ORAL_REPEAT_HINT,
        parameters: {
          type: "object",
          properties: {
            target_text: { type: "string", description: "外语短句（一行）" },
            native_text: { type: "string", description: "中文对照（可选）" },
          },
          required: ["target_text"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: STUDY_TOOL_NAMES.long_phrase,
        description:
          "在右侧展示外语长句/小段及可选中文对照；用户要长句、段落学习时调用。出面板后自然朗读，勿念 JSON。" + ORAL_REPEAT_HINT,
        parameters: {
          type: "object",
          properties: {
            target_text: { type: "string", description: "外语长句或段落" },
            native_text: { type: "string", description: "中文对照或释义（可选）" },
          },
          required: ["target_text"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: STUDY_TOOL_NAMES.dialogue,
        description:
          "在右侧卡片中展示多轮场景对话。优先传 turns 数组；也可传 turns_json（同结构的 JSON 字符串）。每项：speaker、line、可选 native。",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "场景标题（可选）" },
            turns_json: {
              type: "string",
              description:
                "与 turns 二选一：JSON 数组字符串，例如 [{\"speaker\":\"店员\",\"line\":\"Can I help you?\",\"native\":\"需要帮忙吗？\"}]",
            },
            turns: {
              type: "array",
              description:
                "与 turns_json 二选一（推荐）：多轮台词，每项含 speaker、line、可选 native / translation",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string", description: "角色名" },
                  role: { type: "string", description: "同 speaker 的别名" },
                  line: { type: "string", description: "外语台词" },
                  text: { type: "string", description: "同 line 的别名" },
                  native: { type: "string", description: "中文意译（可选）" },
                  translation: { type: "string", description: "同 native 的别名" },
                },
                additionalProperties: true,
              },
            },
          },
          required: [],
          additionalProperties: false,
        },
      },
    },
  ];
}

export function studyModeFocusUserText(mode: StudyModeId): string {
  const label = STUDY_MODE_TABS.find((t) => t.id === mode)?.label ?? mode;
  const tool =
    mode === "flashcard"
      ? STUDY_TOOL_NAMES.flashcard
      : mode === "short_phrase"
        ? STUDY_TOOL_NAMES.short_phrase
        : mode === "long_phrase"
          ? STUDY_TOOL_NAMES.long_phrase
          : STUDY_TOOL_NAMES.dialogue;
  return (
    `【学习模式｜${label}】用户已切换到「${label}」练习区（界面 Tab 已高亮）。请根据用户接下来一两句的需求，**调用对应工具** 在右侧展示内容：` +
    tool +
    `。若用户尚未说具体主题，可先口语问一句想学什么，再调工具出示例。`
  );
}
