"use client";

import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      "not-prose mb-4 w-full rounded-2xl border border-foreground/5 bg-muted/30",
      className,
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  className?: string;
};

const statusConfig: Record<
  ToolUIPart["state"],
  { label: string; icon: ReactNode }
> = {
  "input-streaming": {
    label: "Pending",
    icon: <CircleIcon className="size-4" />,
  },
  "input-available": {
    label: "Running",
    icon: <ClockIcon className="size-4 animate-pulse" />,
  },
  "approval-requested": {
    label: "Awaiting approval",
    icon: <ClockIcon className="size-4 text-yellow-600" />,
  },
  "approval-responded": {
    label: "Responded",
    icon: <CheckCircleIcon className="size-4 text-blue-600" />,
  },
  "output-available": {
    label: "Done",
    icon: <CheckCircleIcon className="size-4 text-green-600" />,
  },
  "output-error": {
    label: "Error",
    icon: <XCircleIcon className="size-4 text-red-600" />,
  },
  "output-denied": {
    label: "Denied",
    icon: <XCircleIcon className="size-4 text-orange-600" />,
  },
};

export const ToolHeader = ({ className, title, type, state }: ToolHeaderProps) => {
  const cfg = statusConfig[state];
  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          {title ?? type.split("-").slice(1).join("-")}
        </span>
        <Badge
          className="gap-1.5 rounded-full text-xs"
          variant="secondary"
        >
          {cfg.icon}
          {cfg.label}
        </Badge>
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <pre className="rounded-md bg-muted/50 p-3 text-xs overflow-x-auto font-mono">
      {JSON.stringify(input, null, 2)}
    </pre>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) return null;

  const content =
    typeof output === "string"
      ? output
      : typeof output === "object"
        ? JSON.stringify(output, null, 2)
        : String(output ?? "");

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <pre
        className={cn(
          "overflow-x-auto rounded-md p-3 text-xs font-mono max-h-48",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground",
        )}
      >
        {errorText ?? content}
      </pre>
    </div>
  );
};
