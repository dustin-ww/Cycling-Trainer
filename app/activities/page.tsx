import { Suspense } from "react";
import { connection } from "next/server";
import { FitnessChart } from "@/components/charts/FitnessChart";
import { FitUpload, ManualActivityForm } from "@/components/activities/ImportForms";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAthlete, getRecentActivities, getTrainingLoad } from "@/lib/data/queries";
import { formatDuration, localDate, formatDay } from "@/lib/dates";
import { FORM_TONE_CLASS, SPORT_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TSS_METHOD = { power: "from power", hr: "from heart rate", rpe: "estimated (RPE)" } as const;

export default function ActivitiesPage() {
  return (
    <main className="space-y-4 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Training</h1>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Load />
      </Suspense>
      <FitUpload />
      <ManualActivityForm />
      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <ActivityList />
      </Suspense>
    </main>
  );
}

async function Load() {
  await connection();
  const athlete = await getAthlete();
  const load = await getTrainingLoad(athlete.id, 90);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Training load (90 days)</CardTitle>
        <CardAction className={cn("text-sm font-medium", FORM_TONE_CLASS[load.form.tone])}>{load.form.label}</CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <FitnessChart points={load.points} />
        <p className="text-xs text-muted-foreground">
          Fitness = 42-day TSS average, fatigue = 7-day average, form = fitness − fatigue.
          {load.rampRate !== null && ` Fitness ramp over the last week: ${load.rampRate.toFixed(1)} per week.`}
          {!athlete.ftp && " Add your FTP under “Goals” so TSS can be calculated from power."}
        </p>
      </CardContent>
    </Card>
  );
}

async function ActivityList() {
  await connection();
  const athlete = await getAthlete();
  const list = await getRecentActivities(athlete.id, 60);
  if (list.length === 0) return <p className="text-center text-sm text-muted-foreground">No activities yet.</p>;
  return (
    <ul className="space-y-2">
      {list.map((a) => (
        <li key={a.id}>
          <Card size="sm">
            <CardHeader>
              <CardDescription className="text-xs">
                {formatDay(localDate(a.startTime))} · {SPORT_LABELS[a.sport] ?? a.sport}
              </CardDescription>
              <CardTitle>{a.name}</CardTitle>
              {a.tss != null && (
                <CardAction className="text-right">
                  <p className="font-semibold tabular-nums">{Math.round(a.tss)} TSS</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.tssMethod ? TSS_METHOD[a.tssMethod as keyof typeof TSS_METHOD] : ""}
                  </p>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>{formatDuration(a.durationS)}</span>
              {a.distanceM != null && <span>{(a.distanceM / 1000).toFixed(1)} km</span>}
              {a.normalizedPower != null && <span>NP {Math.round(a.normalizedPower)} W</span>}
              {a.intensityFactor != null && <span>IF {a.intensityFactor.toFixed(2)}</span>}
              {a.avgHr != null && <span>avg {Math.round(a.avgHr)} bpm</span>}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
