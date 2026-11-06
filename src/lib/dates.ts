/** Today's date as YYYY-MM-DD in local time. */
export const todayIso = () => new Date().toLocaleDateString('en-CA')

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', opts)
}

export const formatShortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' })

export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`
