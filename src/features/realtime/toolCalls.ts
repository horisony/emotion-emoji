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

    /** 任意 item 上挂载的 tool_calls（assistant message 常见） */
    const nested = item.tool_calls as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(nested)) {
      for (const tc of nested) {
        const fn = tc.function as { name?: string; arguments?: string } | undefined;
        const tn = (fn?.name as string | undefined) || (tc.name as string | undefined);
        if (tn !== toolName) continue;
        const tcId =
          (tc.id as string | undefined) ||
          (tc.call_id as string | undefined);
        if (!tcId) continue;
        const tcArgs = tc.arguments ?? fn?.arguments;
        const tcArgStr =
          typeof tcArgs === "string" ? tcArgs : tcArgs != null ? JSON.stringify(tcArgs) : "{}";
        out.push({ callId: tcId, arguments: tcArgStr });
      }
    }

    const itemType = String(item.type ?? "");
    const name =
      (item.name as string | undefined) ||
      ((item.function as { name?: string } | undefined)?.name as string | undefined);
    if (name !== toolName) return;
    /** Realtime 的 function_call 必须用 call_id 回 function_call_output；item.id 是会话项 id，混用会失败 */
    let callId =
      (item.call_id as string | undefined) ||
      (item.callId as string | undefined);
    if (!callId && itemType !== "function_call") {
      callId = (item.id as string | undefined) || undefined;
    }
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

/**
 * 在 extractToolCalls 基础上，深度遍历整条事件 JSON，抓取任意嵌套里出现的同名工具调用（兼容 StepFun 等非标准嵌套）。
 * 仅用于闪卡等对误报不敏感的工具；识图仍用 extractToolCalls 以免误匹配。
 */
export function extractToolCallsWide(
  event: { response?: { output?: Array<Record<string, unknown>> }; item?: Record<string, unknown> },
  toolName: string
): Array<{ callId: string; arguments: string }> {
  const base = extractToolCalls(event, toolName);
  const seen = new Set(base.map((x) => x.callId));
  const out = [...base];

  const tryPush = (o: Record<string, unknown>) => {
    const name =
      (o.name as string | undefined) ||
      (o.tool_name as string | undefined) ||
      ((o.function as { name?: string } | undefined)?.name as string | undefined);
    if (name !== toolName) return;
    const hasShape =
      "call_id" in o || "callId" in o || "arguments" in o || (o.function && typeof o.function === "object");
    if (!hasShape) return;
    let callId =
      (o.call_id as string | undefined) ||
      (o.callId as string | undefined) ||
      (o.id as string | undefined);
    if (!callId) return;
    if (seen.has(callId)) return;
    const rawArgs = o.arguments ?? (o.function as { arguments?: string } | undefined)?.arguments;
    const argumentsStr =
      typeof rawArgs === "string" ? rawArgs : rawArgs != null ? JSON.stringify(rawArgs) : "{}";
    seen.add(callId);
    out.push({ callId, arguments: argumentsStr });
  };

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const el of node) visit(el);
      return;
    }
    tryPush(node as Record<string, unknown>);
    for (const v of Object.values(node as Record<string, unknown>)) {
      visit(v);
    }
  };

  visit(event);
  return out;
}
