import Anthropic from "@anthropic-ai/sdk";
import { runCoach, type CoachEvent } from "@/lib/coach/agent";

export async function POST(request: Request) {
  const { message } = (await request.json()) as { message?: string };
  if (!message?.trim()) {
    return Response.json({ error: "Message missing" }, { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    const e = { type: "error", message: "ANTHROPIC_API_KEY is missing – please add it to .env.local." } satisfies CoachEvent;
    return new Response(JSON.stringify(e) + "\n", { headers: { "Content-Type": "application/x-ndjson" } });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: CoachEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runCoach(message.trim(), emit);
      } catch (error) {
        console.error("Coach error", error);
        let text = "The coach is currently unavailable.";
        if (error instanceof Anthropic.AuthenticationError) text = "API key invalid or not set (ANTHROPIC_API_KEY).";
        else if (error instanceof Anthropic.RateLimitError) text = "Too many requests – please try again shortly.";
        else if (error instanceof Anthropic.APIError) text = `API error ${error.status ?? ""}: ${error.message}`;
        emit({ type: "error", message: text });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
