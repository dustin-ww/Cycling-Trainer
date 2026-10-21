import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta";
import { db } from "@/lib/db";
import { coachMessages } from "@/lib/db/schema";
import { getAthlete, getCoachHistory } from "@/lib/data/queries";
import { APP_TIMEZONE, localDate } from "@/lib/dates";
import { COACH_SYSTEM_PROMPT } from "./prompt";
import { createCoachTools, TOOL_LABELS } from "./tools";

export const COACH_MODEL = process.env.COACH_MODEL ?? "claude-opus-5-5";

/** Events streamed to the client as NDJSON. */
export type CoachEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string }
  | { type: "turn" }
  | { type: "done"; planChanged: boolean }
  | { type: "error"; message: string };

const client = new Anthropic();

function contextBlock(): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: APP_TIMEZONE }).format(new Date());
  return `[Context: Today is ${weekday}, ${localDate()}]`;
}

export async function runCoach(userText: string, emit: (e: CoachEvent) => void) {
  const athlete = await getAthlete();
  const history = await getCoachHistory(athlete.id);

  const userMessage: BetaMessageParam = {
    role: "user",
    content: [
      { type: "text", text: contextBlock() },
      { type: "text", text: userText },
    ],
  };
  const messages: BetaMessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as BetaMessageParam),
    userMessage,
  ];
  const initialLength = messages.length - 1;

  const runner = client.beta.messages.toolRunner({
    model: COACH_MODEL,
    max_tokens: 32000,
    stream: true,
    max_iterations: 15,
    system: COACH_SYSTEM_PROMPT,
    // History is only appended to, never rewritten → the prompt cache hits across turns
    cache_control: { type: "ephemeral" },
    output_config: { effort: "medium" },
    // If the model refuses for policy reasons, a fallback model takes over server-side
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    tools: createCoachTools(athlete.id),
    messages,
  });

  let planChanged = false;
  let first = true;
  for await (const stream of runner) {
    if (!first) emit({ type: "turn" });
    first = false;
    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        const name = event.content_block.name;
        if (name === "schedule_workout" || name === "update_workout") planChanged = true;
        emit({ type: "tool", name, label: TOOL_LABELS[name] ?? name });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        emit({ type: "text", text: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      emit({ type: "error", message: "The coach could not answer this request." });
    }
  }

  const final = await runner.done();
  const newMessages = runner.params.messages.slice(initialLength);
  if (newMessages.at(-1)?.role !== "assistant") {
    newMessages.push({ role: "assistant", content: final.content });
  }

  // Only persist after a successful run so the history never contains a tool_use without its tool_result
  await db.insert(coachMessages).values(
    newMessages.map((m) => ({ athleteId: athlete.id, role: m.role, content: m.content })),
  );

  emit({ type: "done", planChanged });
}
