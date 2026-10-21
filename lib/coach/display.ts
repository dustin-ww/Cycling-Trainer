import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";

export type ChatPart = { kind: "text"; text: string } | { kind: "tool"; name: string; label: string };
export type ChatMessage = { id: string; role: "user" | "assistant"; parts: ChatPart[] };

/**
 * Converts the stored API history into a chat view: context blocks and
 * tool_result-only messages are hidden, consecutive assistant messages of a
 * single run are merged.
 */
export function toChatMessages(
  history: { id: number; role: string; content: unknown }[],
  toolLabels: Record<string, string>,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const row of history) {
    if (row.role === "system") continue;
    const content = row.content as BetaMessageParam["content"];
    const blocks: BetaContentBlockParam[] = typeof content === "string" ? [{ type: "text", text: content }] : content;

    if (row.role === "user") {
      const texts = blocks.filter((b) => b.type === "text");
      if (texts.length === 0) continue; // tool_result only
      const last = texts[texts.length - 1];
      if (last.type === "text") out.push({ id: String(row.id), role: "user", parts: [{ kind: "text", text: last.text }] });
      continue;
    }

    const parts: ChatPart[] = [];
    for (const b of blocks) {
      if (b.type === "text" && b.text.trim()) parts.push({ kind: "text", text: b.text });
      if (b.type === "tool_use") parts.push({ kind: "tool", name: b.name, label: toolLabels[b.name] ?? b.name });
    }
    const prev = out[out.length - 1];
    if (prev?.role === "assistant") prev.parts.push(...parts);
    else out.push({ id: String(row.id), role: "assistant", parts });
  }
  return out;
}
