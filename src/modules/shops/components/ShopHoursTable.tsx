interface DayHours { open: string; close: string; closed?: boolean }
type HoursJson = Record<string, DayHours>
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

function isOpenNow(hours: HoursJson): boolean {
  const now = new Date()
  const dayKey = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const today = hours[dayKey]
  if (!today || today.closed) return false
  const [oh, om] = today.open.split(':').map(Number)
  const [ch, cm] = today.close.split(':').map(Number)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= oh * 60 + om && nowMins < ch * 60 + cm
}

export function ShopHoursTable({ hoursJson }: { hoursJson: HoursJson }) {
  const open = isOpenNow(hoursJson)
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${open ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
          {open ? 'Open Now' : 'Closed'}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {DAYS.map((day) => {
            const h = hoursJson[day]
            return (
              <tr key={day} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-1.5 font-medium text-[var(--color-text)]">{DAY_LABELS[day]}</td>
                <td className="py-1.5 text-right text-[var(--color-text-muted)]">
                  {!h || h.closed ? 'Closed' : `${h.open} – ${h.close}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
