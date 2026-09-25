/** First GUID segment, matching the "ID: xxxxxxxx" style of ProviderDirectory. */
export function shortId(id: string): string {
  return id.split("-")[0];
}

/** Backend amounts are LKR (it phrases prices as "Rs." elsewhere). */
export function formatMoney(amount: number | null): string {
  if (amount === null) return "—";
  return `Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(iso: string | null, fallback = "—"): string {
  return iso ? new Date(iso).toLocaleString() : fallback;
}

/** ISO-8601 (any offset) → the local "YYYY-MM-DDTHH:mm" a datetime-local input expects. */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value (local time, no offset) → UTC ISO string for DateTimeOffset. */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
