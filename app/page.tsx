import { Suspense } from "react";
import { connection } from "next/server";
import { CoachChat } from "@/components/coach/CoachChat";
import { CheckInSheet } from "@/components/checkin/CheckInSheet";
import { WorkoutCard } from "@/components/plan/WorkoutCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAthlete, getCoachHistory, getPlan, getTrainingLoad } from "@/lib/data/queries";
import { toChatMessages } from "@/lib/coach/display";
import { TOOL_LABELS } from "@/lib/coach/tools";
import { localDate } from "@/lib/dates";
import { FORM_TONE_CLASS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function CoachPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <h1 className="text-2xl font-bold">Your coach</h1>
      </header>
      <Suspense fallback={<Skeleton className="mx-4 h-28 rounded-xl" />}>
        <Today />
      </Suspense>
      <Suspense fallback={<div className="flex-1" />}>
        <Chat />
      </Suspense>
    </main>
  );
}

async function Today() {
  await connection();
  const athlete = await getAthlete();
  const today = localDate();
  const [load, plan] = await Promise.all([getTrainingLoad(athlete.id, 42), getPlan(athlete.id, today, today)]);

  return (
    <section className="space-y-3 px-4 pb-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Today&apos;s form</p>
            <p className={cn("text-lg font-semibold", FORM_TONE_CLASS[load.form.tone])}>{load.form.label}</p>
            <p className="text-xs text-muted-foreground">{load.form.description}</p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-3 text-center">
            {[
              ["Fitness", load.current.ctl],
              ["Fatigue", load.current.atl],
              ["Form", load.current.tsb],
            ].map(([label, value]) => (
              <div key={label as string} className="flex flex-col-reverse">
                <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{Math.round(value as number)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {plan.map((w) => (
        <WorkoutCard key={w.id} workout={w} compact />
      ))}
      <CheckInSheet />
    </section>
  );
}

async function Chat() {
  const athlete = await getAthlete();
  const history = await getCoachHistory(athlete.id);
  return <CoachChat initialMessages={toChatMessages(history, TOOL_LABELS)} />;
}
