"use client";

import { useTransition } from "react";
import { setWorkoutStatus } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function WorkoutStatusButtons({ id, status }: { id: number; status: string }) {
  const [pending, startTransition] = useTransition();
  const set = (s: "planned" | "completed" | "skipped") => startTransition(() => setWorkoutStatus(id, s));

  if (status !== "planned") {
    return (
      <Button variant="outline" disabled={pending} onClick={() => set("planned")} className="w-full">
        Reset
      </Button>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button variant="outline" disabled={pending} onClick={() => set("completed")}>
        Done
      </Button>
      <Button variant="outline" disabled={pending} onClick={() => set("skipped")}>
        Skip
      </Button>
    </div>
  );
}
