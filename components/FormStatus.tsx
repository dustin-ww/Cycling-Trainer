import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/actions";

/** Success/error message returned by a server action. */
export function FormStatus({ state, className }: { state: ActionState; className?: string }) {
  if (!state) return null;
  return (
    <p role="status" className={cn("text-sm", state.ok ? "text-success" : "text-destructive", className)}>
      {state.message}
    </p>
  );
}
