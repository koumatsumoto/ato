export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading todo" className="space-y-4 animate-pulse">
      <div className="h-4 w-16 rounded bg-gray-200" />
      <div className="h-10 w-full rounded-lg bg-gray-200" />
      <div className="h-48 w-full rounded-lg bg-gray-200" />
      <div className="flex justify-between">
        <div className="h-10 w-24 rounded-lg bg-gray-200" />
        <div className="h-10 w-20 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
