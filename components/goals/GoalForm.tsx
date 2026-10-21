"use client";

import { useActionState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { createGoal, setGoalStatus } from "@/lib/actions";
import { FormStatus } from "@/components/FormStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const GOAL_TYPES = [
  { value: "event", label: "Event / race" },
  { value: "ftp", label: "Raise FTP" },
  { value: "weight", label: "Weight" },
  { value: "volume", label: "Volume / consistency" },
  { value: "general", label: "General" },
];

const PRIORITIES = [
  { value: "A", label: "A – season highlight" },
  { value: "B", label: "B – important" },
  { value: "C", label: "C – on the side" },
];

export function GoalForm() {
  const [state, action, pending] = useActionState(createGoal, null);
  return (
    <Card size="sm">
      <Collapsible className="group/collapsible">
        <CardContent>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" /> New goal
            </span>
            <ChevronDown className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form action={action} className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="goal-title">Goal*</Label>
                <Input id="goal-title" name="title" required placeholder="e.g. Ötztaler Radmarathon under 9 h" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-type">Type</Label>
                <Select name="type" defaultValue="event">
                  <SelectTrigger id="goal-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-priority">Priority</Label>
                <Select name="priority" defaultValue="A">
                  <SelectTrigger id="goal-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-date">Date</Label>
                <Input id="goal-date" name="targetDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-value">Target value</Label>
                <Input id="goal-value" name="targetValue" placeholder="e.g. 300 W" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="goal-description">Details for the coach</Label>
                <Textarea
                  id="goal-description"
                  name="description"
                  rows={3}
                  placeholder="Route, elevation, what matters to you, past experience …"
                />
              </div>
              <Button type="submit" size="lg" disabled={pending} className="col-span-2">
                {pending ? "Creating…" : "Create goal"}
              </Button>
              <FormStatus state={state} className="col-span-2" />
            </form>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export function GoalStatusButtons({ id, status }: { id: number; status: string }) {
  const [pending, startTransition] = useTransition();
  const set = (s: "active" | "achieved" | "dropped") => startTransition(() => setGoalStatus(id, s));
  if (status !== "active") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => set("active")}>
        Reactivate
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <Button variant="outline" disabled={pending} onClick={() => set("achieved")}>
        Achieved 🎉
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => set("dropped")}>
        Drop
      </Button>
    </div>
  );
}
