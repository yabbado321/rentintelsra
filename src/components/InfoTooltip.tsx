import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoTooltipProps {
  /** Human-readable formula, e.g. "NOI ÷ Total Cash Invested" */
  formula: string;
  /** Optional one-line plain-English context. */
  note?: string;
}

/**
 * Glass-box tooltip used next to every major output metric so the user
 * can always see exactly how a number was derived.
 */
export default function InfoTooltip({ formula, note }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Formula details"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-1.5 border-primary/30 bg-card/95 backdrop-blur-xl">
          <p className="font-mono text-[11px] leading-snug text-foreground">{formula}</p>
          {note && <p className="text-[10px] leading-snug text-muted-foreground">{note}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
