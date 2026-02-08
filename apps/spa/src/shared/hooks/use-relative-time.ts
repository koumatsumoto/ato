import { useEffect, useState } from "react";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return `${diffSec}秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}時間前`;
}

export function useRelativeTime(date: Date | null): string | null {
  const [text, setText] = useState<string | null>(() => (date ? formatRelativeTime(date) : null));

  useEffect(() => {
    if (!date) {
      setText(null);
      return;
    }

    setText(formatRelativeTime(date));

    const diffMs = Date.now() - date.getTime();
    const intervalMs = diffMs < 60_000 ? 1_000 : 60_000;

    const id = setInterval(() => setText(formatRelativeTime(date)), intervalMs);
    return () => clearInterval(id);
  }, [date]);

  return text;
}
