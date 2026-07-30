import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Shared building blocks for route-level loading.tsx files. Each mirrors
// the shape of the real list/form pages (header, tabs, filter bar, table)
// closely enough that the skeleton-to-content swap doesn't jump around,
// without needing a 1:1 pixel match per page.

export function LoadingRegion({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      {children}
    </div>
  );
}

export function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-7 w-48" />
      {actions > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32" />
          ))}
        </div>
      )}
    </div>
  );
}

export function TabsSkeleton() {
  return (
    <div className="flex gap-4 border-b border-border pb-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function FilterBarSkeleton({
  fields = 3,
  withSearch = true,
}: {
  fields?: number;
  withSearch?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {withSearch && <Skeleton className="h-10 w-full max-w-sm" />}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-10 w-32" />
        </div>
      ))}
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

// Every column stretches with flex-1 (like the real `<table class="w-full">`
// columns do) so the skeleton fills the row's full width instead of
// leaving a blank gap on the right on wide screens — that gap was the
// "rest of the screen looks empty" issue.
export function TableSkeleton({
  rows = 7,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex w-full min-w-[560px] flex-col gap-3">
        <div className="flex gap-6 border-b border-border pb-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-6 border-b border-border/50 py-2"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardListSkeleton({ items = 2 }: { items?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-md border border-border">
          <div className="flex items-center justify-between p-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <div className="border-t border-border p-3">
            <TableSkeleton rows={3} cols={4} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

export function BackLinkHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-7 w-64" />
    </div>
  );
}
