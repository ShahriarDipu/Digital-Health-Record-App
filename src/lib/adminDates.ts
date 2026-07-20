export function startOfDayUTC(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function startOfWeekUTC(date = new Date()): Date {
  const start = startOfDayUTC(date);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}
