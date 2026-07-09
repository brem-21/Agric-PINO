export function resolveRange(range: string, fromParam: string | null, toParam: string | null): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  if (range === "custom" && fromParam && toParam) {
    const f = new Date(fromParam);
    const t = new Date(toParam);
    t.setHours(23, 59, 59, 999);
    return { from: f, to: t };
  }
  if (range === "day") {
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (range === "week") {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (range === "year") {
    from.setDate(from.getDate() - 364);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  // default: month (last 30 days)
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}
