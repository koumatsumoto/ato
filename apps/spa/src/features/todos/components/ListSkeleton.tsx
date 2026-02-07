export function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading todos" className="space-y-2 animate-pulse">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
          <div className="h-5 w-5 rounded-full bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200" style={{ width: `${60 + i * 5}%` }} />
        </div>
      ))}
    </div>
  );
}
