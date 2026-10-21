"use client";

import { useActionState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { addManualActivity, importFit } from "@/lib/actions";
import { SPORTS } from "@/lib/sports";
import { SPORT_LABELS } from "@/lib/labels";
import { FormStatus } from "@/components/FormStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FitUpload() {
  const [state, action, pending] = useActionState(importFit, null);
  return (
    <Card size="sm">
      <CardContent>
        <form action={action} className="space-y-3">
          <Label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed py-5 font-normal text-muted-foreground hover:bg-muted/50">
            <Upload className="size-5" />
            Choose .fit files (Garmin, Wahoo, Zwift …)
            <input name="files" type="file" accept=".fit" multiple className="sr-only" />
          </Label>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Importing…" : "Import"}
          </Button>
          <FormStatus state={state} />
        </form>
      </CardContent>
    </Card>
  );
}

const NUMBER_FIELDS = [
  { name: "durationMin", label: "Duration (min)*", required: true, inputMode: "numeric" },
  { name: "distanceKm", label: "Distance (km)", step: "0.1", inputMode: "decimal" },
  { name: "avgPower", label: "Avg power (W)", inputMode: "numeric" },
  { name: "avgHr", label: "Avg heart rate", inputMode: "numeric" },
] as const;

export function ManualActivityForm() {
  const [state, action, pending] = useActionState(addManualActivity, null);
  return (
    <Card size="sm">
      <Collapsible className="group/collapsible">
        <CardContent>
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium">
            Log an activity manually
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <form action={action} className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="activity-name">Name</Label>
                <Input id="activity-name" name="name" placeholder="e.g. Gym strength session" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-sport">Sport</Label>
                <Select name="sport" defaultValue="cycling">
                  <SelectTrigger id="activity-sport" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SPORT_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-date">Date</Label>
                <Input id="activity-date" name="date" type="date" />
              </div>
              {NUMBER_FIELDS.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={`activity-${f.name}`}>{f.label}</Label>
                  <Input
                    id={`activity-${f.name}`}
                    name={f.name}
                    type="number"
                    step={"step" in f ? f.step : undefined}
                    required={"required" in f}
                    inputMode={f.inputMode}
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="activity-rpe">Effort (RPE 1–10)</Label>
                <Input id="activity-rpe" name="rpe" type="number" min={1} max={10} inputMode="numeric" />
              </div>
              <Button type="submit" size="lg" disabled={pending} className="col-span-2">
                {pending ? "Saving…" : "Save"}
              </Button>
              <FormStatus state={state} className="col-span-2" />
            </form>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
