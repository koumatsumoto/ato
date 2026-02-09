import { Waveform } from "@uiball/loaders";

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="やることを読み込み中" className="flex items-center justify-center py-12">
      <Waveform size={40} lineWeight={3.5} speed={1} color="#9ca3af" />
    </div>
  );
}
