import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { WorkoutCard } from "@/components/plan/WorkoutCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAthlete, getPlan } from "@/lib/data/queries";
import { addDays } from "@/lib/training/load";
import { localDate } from "@/lib/dates";

export default function PlanPage() {
  return (
    <main className="space-y-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Training plan</h1>
      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <Plan />
      </Suspense>
    </main>
  );
}

async function Plan() {
  await connection();
  const athlete = await getAthlete();
  const today = localDate();
  const workouts = await getPlan(athlete.id, addDays(today, -3), addDays(today, 21));
  const upcoming = workouts.filter((w) => w.date >= today);
  const past = workouts.filter((w) => w.date < today);

  if (workouts.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 text-center">
          <p className="text-muted-foreground">No workouts planned yet.</p>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Ask the coach for a plan</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {upcoming.map((w) => (
        <WorkoutCard key={w.id} workout={w} />
      ))}
      {past.length > 0 && (
        <>
          <h2 className="pt-4 text-sm font-medium text-muted-foreground">Last few days</h2>
          {past.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </>
      )}
    </div>
  );
}
