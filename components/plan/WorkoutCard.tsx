import { ArrowDown, ArrowUp, Check, ChevronDown, History, Minus } from "lucide-react";
import type { PlannedWorkout } from "@/lib/db/schema";
import { formatDay } from "@/lib/dates";
import { SPORT_LABELS, WORKOUT_TYPE_STYLES } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { WorkoutStatusButtons } from "./WorkoutStatusButtons";

export function WorkoutCard({ workout, compact = false }: { workout: PlannedWorkout; compact?: boolean }) {
  const style = WORKOUT_TYPE_STYLES[workout.workoutType] ?? WORKOUT_TYPE_STYLES.endurance;
  const r = workout.rationale;
  const done = workout.status !== "planned";

  return (
    <Card className={cn(done && "opacity-60")}>
      <CardHeader>
        <CardDescription className="text-xs">
          {formatDay(workout.date)} · {SPORT_LABELS[workout.sport] ?? workout.sport}
        </CardDescription>
        <CardTitle className={cn("font-semibold", workout.status === "skipped" && "line-through")}>
          {workout.title}
        </CardTitle>
        <CardAction>
          <Badge className={style.className}>{style.label}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex gap-4">
          <span>
            <strong>{workout.durationMin}</strong> min
          </span>
          {workout.targetTss != null && (
            <span>
              <strong>{Math.round(workout.targetTss)}</strong> TSS
            </span>
          )}
          {workout.status === "completed" && (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-4" /> done
            </span>
          )}
          {workout.status === "skipped" && <span className="text-muted-foreground">skipped</span>}
        </div>

        {!compact && workout.description && <p className="text-muted-foreground">{workout.description}</p>}

        {!compact && workout.structure.length > 0 && (
          <ol className="space-y-1 rounded-lg bg-muted p-3">
            {workout.structure.map((s, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  {s.repeat && s.repeat > 1 ? `${s.repeat}× ` : ""}
                  {s.label}
                </span>
                <span className="text-muted-foreground">
                  {s.durationMin} min · {s.target}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Explainability: the coach's structured rationale */}
        <Collapsible className="group/why rounded-lg border">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-primary">
            Why this workout?
            <ChevronDown className="size-4 transition-transform group-data-[state=open]/why:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 px-3 pb-3">
            <p>{r.summary}</p>
            <ul className="space-y-1.5">
              {r.factors.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  {f.effect === "increase" ? (
                    <ArrowUp className="size-3.5 shrink-0 text-warning" />
                  ) : f.effect === "decrease" ? (
                    <ArrowDown className="size-3.5 shrink-0 text-info" />
                  ) : (
                    <Minus className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">{f.label}:</span>
                  <span className="font-medium">{f.value}</span>
                </li>
              ))}
            </ul>
            <p>
              <span className="text-muted-foreground">Principle:</span> {r.principle}
            </p>
            <p>
              <span className="text-muted-foreground">Confidence:</span> {r.confidence}
            </p>
            {r.alternatives && (
              <p>
                <span className="text-muted-foreground">Alternative:</span> {r.alternatives}
              </p>
            )}
            {workout.changeLog.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <History className="size-3.5" /> Changes
                  </p>
                  {workout.changeLog.map((c, i) => (
                    <p key={i}>
                      <strong>{c.change}</strong> – {c.reason}
                    </p>
                  ))}
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {!compact && (
        <CardFooter>
          <WorkoutStatusButtons id={workout.id} status={workout.status} />
        </CardFooter>
      )}
    </Card>
  );
}
