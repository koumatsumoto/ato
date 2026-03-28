import { ACTION_ORDER_KEY } from "@/shared/lib/storage-keys";

export function getOrderMap(): ReadonlyMap<number, number> {
  const stored = localStorage.getItem(ACTION_ORDER_KEY);
  if (!stored) return new Map();

  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return new Map();
    const map = new Map<number, number>();
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(key);
      if (Number.isInteger(id) && typeof value === "number" && Number.isFinite(value)) {
        map.set(id, value);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function persistMap(map: ReadonlyMap<number, number>): void {
  const obj: Record<string, number> = {};
  for (const [k, v] of map) {
    obj[String(k)] = v;
  }
  try {
    localStorage.setItem(ACTION_ORDER_KEY, JSON.stringify(obj));
  } catch {
    // QuotaExceededError — in-memory state remains correct for this session
  }
}

export function setOrderEntry(id: number, sortKey: number): ReadonlyMap<number, number> {
  const current = getOrderMap();
  const updated = new Map(current);
  updated.set(id, sortKey);
  persistMap(updated);
  return updated;
}

export function saveRebalancedMap(map: ReadonlyMap<number, number>): void {
  persistMap(map);
}

export function pruneOrderMap(currentMap: ReadonlyMap<number, number>, activeIds: ReadonlySet<number>): ReadonlyMap<number, number> | null {
  let pruned = false;
  const updated = new Map<number, number>();
  for (const [id, key] of currentMap) {
    if (activeIds.has(id)) {
      updated.set(id, key);
    } else {
      pruned = true;
    }
  }
  if (!pruned) return null;
  persistMap(updated);
  return updated;
}
