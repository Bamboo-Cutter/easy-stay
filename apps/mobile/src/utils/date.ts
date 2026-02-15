export function toIsoDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function dayLabel(isoText) {
  if (!isoText) return '-';
  const d = new Date(isoText);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function afterDays(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}
