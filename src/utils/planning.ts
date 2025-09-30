export function parseReleaseDate(
  input?: string | null,
  requireTime = false
): Date | null {
  if (!input) {
    return null;
  }

  const s = input.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})$/);

  if (m) {
    const [, dd, mm, yyyy, hh, min] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min)
    );

    return Number.isNaN(+d) ? null : d;
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    if (requireTime) {
      return null;
    }
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    return Number.isNaN(+d) ? null : d;
  }
  return null;
}
