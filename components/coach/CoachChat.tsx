"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUp, Check, Loader2, RotateCcw } from "lucide-react";
import type { ChatMessage, ChatPart } from "@/lib/coach/display";
import type { CoachEvent } from "@/lib/coach/agent";
import { clearCoachChat } from "@/lib/actions";
import { Markdown } from "@/components/coach/Markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "Plan my next week",
  "How is my current form?",
  "I'm tired today – what should I do?",
  "Suggest some cross-training",
];

export function CoachChat({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function updateAssistant(fn: (parts: ChatPart[]) => ChatPart[]) {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, parts: fn(last.parts) }];
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: `u${now}`, role: "user", parts: [{ kind: "text", text }] },
      { id: `a${now}`, role: "assistant", parts: [] },
    ]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.body) throw new Error("No response from server");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let startNewText = true;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as CoachEvent;
          if (event.type === "text") {
            const append = !startNewText;
            startNewText = false;
            updateAssistant((parts) => {
              const last = parts[parts.length - 1];
              if (append && last?.kind === "text") {
                return [...parts.slice(0, -1), { ...last, text: last.text + event.text }];
              }
              return [...parts, { kind: "text", text: event.text }];
            });
          } else if (event.type === "tool") {
            startNewText = true;
            updateAssistant((parts) => [...parts, { kind: "tool", name: event.name, label: event.label }]);
          } else if (event.type === "turn") {
            startNewText = true;
          } else if (event.type === "error") {
            setError(event.message);
          } else if (event.type === "done" && event.planChanged) {
            startTransition(() => router.refresh());
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 px-4 pb-4">
        {messages.length === 0 && (
          <Card size="sm">
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask me anything about your training. For every recommendation I&apos;ll explain which data it is based on.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={m.id} message={m} pending={busy && i === messages.length - 1} />
        ))}

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {messages.length > 0 && !busy && (
          <div className="flex justify-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="xs" className="text-muted-foreground">
                  <RotateCcw /> New conversation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                  <AlertDialogDescription>Your plans and training data will be kept.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={async () => {
                      await clearCoachChat();
                      setMessages([]);
                    }}
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 px-4 py-3 backdrop-blur"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Message your coach…"
            className="max-h-32 min-h-11 resize-none bg-card"
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()} className="size-11 rounded-xl" aria-label="Send">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message, pending }: { message: ChatMessage; pending: boolean }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
        {message.parts.map((p, i) => (p.kind === "text" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> : null))}
      </div>
    );
  }

  return (
    <div className="max-w-[95%] space-y-2">
      {message.parts.map((p, i) =>
        p.kind === "tool" ? (
          // Transparency: show which data the coach looked at
          <Badge key={i} variant="secondary" className="mr-1.5 h-6 px-2.5 text-muted-foreground">
            <Check className="text-success" /> {p.label}
          </Badge>
        ) : (
          <Card key={i} size="sm">
            <CardContent className="text-base">
              <Markdown text={p.text} />
            </CardContent>
          </Card>
        ),
      )}
      {pending && (
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Coach is thinking…
        </span>
      )}
    </div>
  );
}
