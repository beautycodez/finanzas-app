const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Format a YYYY-MM-DD string as "DD <month> YYYY" without timezone issues
export function formatDateShort(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  return `${String(day).padStart(2, "0")} ${MONTHS_SHORT[(month - 1) % 12]} ${year}`;
}
