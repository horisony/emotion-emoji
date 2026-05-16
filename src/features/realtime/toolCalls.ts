/**
 * 从 Realtime / StepFun 代理下发的 JSON 事件里提取指定 function 工具的 call_id 与参数字符串。
 * 兼容 item 单条与 response.output 数组、嵌套 tool_calls 等形状。
 */
export function extractToolCalls(
  event: {
    response?: { output?: Array<Record<string, unknown>> };
    item?: Record<string, unknown>;
  },
  toolName: string
): Array<{ callId: string; arguments: string }> {
  const out: Array<{ callId: string; arguments: string }> = [];

  const pushIf = (item: Record<string, unknown> | undefined) => {
    if (!item) return;
    const name =
      (item.name as string | undefined) ||
      ((item.function as { name?: string } | undefined)?.name as string | undefined);
    if (name !== toolName) return;
    const callId =
      (item.call_id as string | undefined) ||
      (item.id as string | undefined) ||
      (item.callId as string | undefined);
    if (!callId) return;
    const rawArgs = item.arguments;
    const argumentsStr =
      typeof rawArgs === "string" ? rawArgs : rawArgs != null ? JSON.stringify(rawArgs) : "{}";
    out.push({ callId, arguments: argumentsStr });
  };

  pushIf(event.item);
  const outputs = event.response?.output;
  if (!Array.isArray(outputs)) return out;
  for (const raw of outputs) {
    const o = raw as Record<string, unknown>;
    pushIf(o);
    const toolCalls = o.tool_calls as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls) {
        const fn = tc.function as { name?: string } | undefined;
        if (fn?.name === toolName || tc.name === toolName) {
          const callId = (tc.id as string | undefined) || (tc.call_id as string | undefined);
          if (!callId) continue;
          const rawArgs = tc.arguments ?? (tc.function as { arguments?: string } | undefined)?.arguments;
          const argumentsStr =
            typeof rawArgs === "string" ? rawArgs : rawArgs != null ? JSON.stringify(rawArgs) : "{}";
          out.push({ callId, arguments: argumentsStr });
        }
      }
    }
  }
  return out;
}
