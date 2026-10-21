import { Suspense } from "react";
import { connection } from "next/server";
import { GoalForm, GoalStatusButtons } from "@/components/goals/GoalForm";
import { ProfileForm } from "@/components/goals/ProfileForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllGoals, getAthlete } from "@/lib/data/queries";
import { daysBetween, localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const PRIORITY_CLASS: Record<string, string> = {
  A: "bg-primary text-primary-foreground",
  B: "bg-warning/20 text-warning",
  C: "bg-muted text-muted-foreground",
};

export default function GoalsPage() {
  return (
    <main className="space-y-4 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <h1 className="text-2xl font-bold">Goals & profile</h1>
      <p className="text-sm text-muted-foreground">
        The coach plans around your goals. A goals are season highlights that the periodization is built towards.
      </p>
      <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
        <Goals />
      </Suspense>
      <GoalForm />
      <Suspense fallback={null}>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Goals() {
  await connection();
  const athlete = await getAthlete();
  const goals = await getAllGoals(athlete.id);
  const today = localDate();
  if (goals.length === 0) {
    return (
      <Card size="sm">
        <CardContent className="text-muted-foreground">No goals yet – add your first one below.</CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {goals.map((g) => (
        <li key={g.id}>
          <Card size="sm" className={cn(g.status !== "active" && "opacity-60")}>
            <CardHeader>
              <CardTitle>{g.title}</CardTitle>
              <CardDescription className="text-xs">
                {g.targetDate ? `${g.targetDate} · ${daysBetween(today, g.targetDate)} days to go` : "no date"}
                {g.targetValue ? ` · Target: ${g.targetValue}` : ""}
              </CardDescription>
              <CardAction>
                <Badge className={cn("font-bold", PRIORITY_CLASS[g.priority])}>{g.priority}</Badge>
              </CardAction>
            </CardHeader>
            {g.description && <CardContent className="text-muted-foreground">{g.description}</CardContent>}
            <CardFooter>
              <GoalStatusButtons id={g.id} status={g.status} />
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}

async function Profile() {
  const athlete = await getAthlete();
  return <ProfileForm athlete={athlete} />;
}
