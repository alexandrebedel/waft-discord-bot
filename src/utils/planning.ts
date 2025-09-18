export function parseReleaseDate(input?: string | null) {
  if (!input) {
    return null;
  }

  const s = input.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00Z`);

    return Number.isNaN(+d) ? null : d;
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (m) {
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    return Number.isNaN(+d) ? null : d;
  }
  const ts = Date.parse(s);

  return Number.isNaN(ts) ? null : new Date(ts);
}
