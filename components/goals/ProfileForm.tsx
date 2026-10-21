"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "@/lib/actions";
import type { Athlete } from "@/lib/db/schema";
import { CROSS_TRAINING_OPTIONS, SPORT_LABELS, WEEKDAYS } from "@/lib/labels";
import { FormStatus } from "@/components/FormStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const FIELDS = [
  { name: "ftp", label: "FTP (W)" },
  { name: "weightKg", label: "Weight (kg)" },
  { name: "lthr", label: "Threshold HR" },
  { name: "maxHr", label: "Max HR" },
  { name: "restingHr", label: "Resting HR" },
  { name: "weeklyHours", label: "Hours per week" },
] as const;

const SELECTED = "data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground";

export function ProfileForm({ athlete }: { athlete: Athlete }) {
  const [state, action, pending] = useActionState(saveProfile, null);
  const [days, setDays] = useState(athlete.availableDays.map(String));
  const [crossTraining, setCrossTraining] = useState(athlete.crossTraining);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" name="name" defaultValue={athlete.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`profile-${f.name}`}>{f.label}</Label>
                <Input
                  id={`profile-${f.name}`}
                  name={f.name}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  defaultValue={athlete[f.name] ?? ""}
                />
              </div>
            ))}
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Training days</legend>
            {/* Toggle groups don't submit with forms, so mirror the selection into hidden inputs */}
            {days.map((d) => (
              <input key={d} type="hidden" name="availableDays" value={d} />
            ))}
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={1}
              value={days}
              onValueChange={setDays}
              aria-label="Training days"
              className="grid w-full grid-cols-7"
            >
              {WEEKDAYS.map((d, i) => (
                <ToggleGroupItem key={d} value={String(i + 1)} className={`h-9 px-0 ${SELECTED}`}>
                  {d}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Cross-training</legend>
            {crossTraining.map((s) => (
              <input key={s} type="hidden" name="crossTraining" value={s} />
            ))}
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={crossTraining}
              onValueChange={setCrossTraining}
              aria-label="Cross-training"
              className="flex-wrap"
            >
              {CROSS_TRAINING_OPTIONS.map((s) => (
                <ToggleGroupItem key={s} value={s} className={`rounded-full ${SELECTED}`}>
                  {SPORT_LABELS[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="profile-notes">Notes for the coach</Label>
            <Textarea
              id="profile-notes"
              name="notes"
              rows={3}
              defaultValue={athlete.notes ?? ""}
              placeholder="Injuries, equipment (trainer, power meter), life circumstances …"
            />
          </div>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save profile"}
          </Button>
          <FormStatus state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
