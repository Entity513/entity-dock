// 日付処理はすべてこのモジュールを経由すること。
// 禁止パターン（JST で日付が1日ずれる）:
//   new Date('YYYY-MM-DD')          → UTC 深夜として解釈される
//   date.toISOString().slice(0,10)  → UTC に変換されてから切り出される
// 例外: 睡眠の timestamptz だけは「時刻の瞬間」を送るため toISOString() を使う。

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD'（端末ローカル） */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 今日の 'YYYY-MM-DD'（端末ローカル） */
export function todayStr(): string {
  return toDateStr(new Date())
}

/** 'YYYY-MM-DD' → ローカル深夜の Date */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = parseDateStr(s)
  return toDateStr(d) === s
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** 'YYYY-MM-DD' → 'YYYY-MM' */
export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

/** 'YYYY-MM' の月初・月末の日付文字列 */
export function monthRange(ym: string): { first: string; last: string } {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { first: `${ym}-01`, last: `${ym}-${pad2(lastDay)}` }
}

export function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** 月曜始まりの月間グリッド。セルは 'YYYY-MM-DD' か null（月外） */
export function monthGrid(ym: string): (string | null)[][] {
  const [y, m] = ym.split('-').map(Number)
  const firstDate = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  // getDay(): 日=0 … 土=6 → 月曜始まりのオフセットに変換
  const leading = (firstDate.getDay() + 6) % 7
  const cells: (string | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(`${ym}-${pad2(day)}`)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** 'YYYY-MM-DD' → '8月19日 (火)' */
export function formatDateJa(dateStr: string): string {
  const d = parseDateStr(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAYS_JA[d.getDay()]})`
}

/** 'YYYY-MM' → '2026年8月' */
export function formatMonthJa(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${y}年${m}月`
}

/** timestamptz ISO → ローカル 'HH:mm' */
export function formatHM(iso: string): string {
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 'HH:MM:SS' または 'HH:MM' (time 型) → 'HH:mm' */
export function formatTimeCol(time: string): string {
  return time.slice(0, 5)
}

/**
 * 睡眠時刻の合成。date は「起床日」。
 * start > end（例 23:30 → 07:00）なら start は前日の時刻として扱う。
 * 戻り値は timestamptz 用の ISO 文字列。
 */
export function combineSleepTimes(
  dateStr: string,
  startHM: string,
  endHM: string,
): { sleepStart: string; sleepEnd: string } {
  const [sh, sm] = startHM.split(':').map(Number)
  const [eh, em] = endHM.split(':').map(Number)
  const base = parseDateStr(dateStr)
  const end = new Date(base)
  end.setHours(eh, em, 0, 0)
  const start = new Date(base)
  start.setHours(sh, sm, 0, 0)
  if (start.getTime() >= end.getTime()) {
    start.setDate(start.getDate() - 1)
  }
  return { sleepStart: start.toISOString(), sleepEnd: end.toISOString() }
}

/** 睡眠時間 '7h30m' 表記 */
export function sleepDurationLabel(
  startIso: string,
  endIso: string,
): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (ms <= 0) return '--'
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h}h${pad2(m)}m`
}
