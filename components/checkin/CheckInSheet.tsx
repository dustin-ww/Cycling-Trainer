"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import { saveCheckIn } from "@/lib/actions";
import { FormStatus } from "@/components/FormStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const SCALES = [
  { name: "sleep", label: "Sleep", low: "poor", high: "great" },
  { name: "energy", label: "Energy", low: "empty", high: "full" },
  { name: "soreness", label: "Soreness", low: "none", high: "severe" },
  { name: "stress", label: "Stress", low: "relaxed", high: "high" },
] as const;

export function CheckInSheet() {
  const [state, action, pending] = useActionState(saveCheckIn, null);

  return (
    <Card size="sm">
      <Collapsible className="group/collapsible">
        <CardContent>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium">
            <span>
              How are you feeling today? <span className="text-sm text-muted-foreground">– Check-in</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form action={action} className="mt-4 space-y-4">
              {SCALES.map((s) => (
                <ScaleField key={s.name} {...s} />
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="availableMin">Time available today (min)</Label>
                <Input id="availableMin" name="availableMin" type="number" inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Note (e.g. cold, travel, heavy legs)</Label>
                <Textarea id="note" name="note" rows={2} />
              </div>
              <Button type="submit" size="lg" disabled={pending} className="w-full">
                {pending ? "Saving…" : "Save"}
              </Button>
              <FormStatus state={state} />
            </form>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

/** 1–5 scale as a toggle group; the hidden input submits the value with the form. */
function ScaleField({ name, label, low, high }: { name: string; label: string; low: string; high: string }) {
  const [value, setValue] = useState("");
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={1}
        value={value}
        onValueChange={setValue}
        aria-label={label}
        className="grid w-full grid-cols-5"
      >
        {[1, 2, 3, 4, 5].map((v) => (
          <ToggleGroupItem
            key={v}
            value={String(v)}
            className="h-9 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {v}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </fieldset>
  );
}
