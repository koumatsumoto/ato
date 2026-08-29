import { lazy, Suspense } from "react";
import { ActionAddForm } from "@/features/actions/components/ActionAddForm";

const ActionListSection = lazy(() =>
  import("@/features/actions/components/ActionListSection").then((module) => ({ default: module.ActionListSection })),
);

function ListSectionFallback(): React.JSX.Element {
  return (
    <div role="status" aria-label="やることを読み込み中" className="space-y-2" aria-live="polite">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/55" />
      ))}
    </div>
  );
}

export function MainPage(): React.JSX.Element {
  return (
    <div className="space-y-8 pb-10">
      <ActionAddForm />
      <section aria-labelledby="action-list-heading">
        <div className="mb-2 flex min-h-10 items-center justify-between px-1">
          <h2 id="action-list-heading" className="text-sm font-semibold tracking-wide text-emerald-950/85">
            残してあること
          </h2>
        </div>
        <Suspense fallback={<ListSectionFallback />}>
          <ActionListSection />
        </Suspense>
      </section>
    </div>
  );
}
