// Health Auto Export (iOS) の REST 送信を受けて daily_logs に UPSERT する。
//
// 構成:
//   Apple Watch → iPhone ヘルスケア → Health Auto Export
//     → (定期POST) → この関数 → daily_logs
//
// 設計上の注意:
// * 日付は JST。HAE は "2026-08-19 00:00:00 +0900" のようにローカル時刻 +
//   オフセット付きで送ってくるので、日付部分をそのまま使う。
//   Date に通して UTC 側から切り出すと朝夕に1日ずれる。
// * 睡眠の行の date は「起床日」。sleepEnd のローカル日付を使う。
// * UPSERT は部分更新。受け取った指標に対応する列だけを payload に入れる
//   （全列を送ると、手入力や Entity が書いた値を null で消してしまう）。
// * 公開 URL になるので、共有シークレットで必ず認証する。
//
// デプロイ:
//   supabase secrets set HEALTH_IMPORT_SECRET=<任意の長い文字列> \
//     --project-ref qnxtxnrzsbzjxejtmvtr
//   supabase functions deploy health-import --no-verify-jwt \
//     --project-ref qnxtxnrzsbzjxejtmvtr
//
// ※ --no-verify-jwt が必要。HAE は Supabase の JWT を送れないため、
//    代わりに x-api-key ヘッダで認証する。

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IMPORT_SECRET = Deno.env.get('HEALTH_IMPORT_SECRET')

/** daily_logs の列 → HAE の指標名（表記ゆれを吸収するため複数受ける） */
const METRIC_ALIASES: Record<string, string[]> = {
  steps: ['step_count', 'steps'],
  active_kcal: ['active_energy', 'active_energy_burned'],
  exercise_min: ['apple_exercise_time', 'exercise_time'],
  stand_hours: ['apple_stand_hour', 'stand_hours', 'apple_stand_hours'],
  weight_kg: ['weight_body_mass', 'body_mass', 'weight'],
}

/** 同じ日に複数点が来たときのまとめ方 */
const AGGREGATION: Record<string, 'sum' | 'last'> = {
  steps: 'sum',
  active_kcal: 'sum',
  exercise_min: 'sum',
  stand_hours: 'sum',
  weight_kg: 'last',
}

const SLEEP_METRICS = ['sleep_analysis', 'sleep']

interface HaeDataPoint {
  date?: string
  qty?: number
  // sleep_analysis のときだけ来る
  sleepStart?: string
  sleepEnd?: string
  asleep?: number
  inBed?: number
  totalSleep?: number
}

interface HaeMetric {
  name?: string
  units?: string
  data?: HaeDataPoint[]
}

/** "2026-08-19 07:10:00 +0900" → ローカル日付 "2026-08-19" */
function localDate(raw: string): string | null {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** "2026-08-18 23:40:00 +0900" → ISO 8601 "2026-08-18T23:40:00+09:00" */
function toIso(raw: string): string | null {
  const m = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?\s*([+-]\d{2}):?(\d{2})?/,
  )
  if (!m) {
    // すでに ISO ならそのまま通す
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const [, date, time, offsetHour, offsetMin = '00'] = m
  return `${date}T${time}${offsetHour}:${offsetMin}`
}

/** kJ で来た場合だけ kcal に直す。それ以外は素通し */
function toKcal(value: number, units?: string): number {
  return units?.toLowerCase() === 'kj' ? value / 4.184 : value
}

type DayPatch = Record<string, number | string>

function applyMetric(
  byDate: Map<string, DayPatch>,
  column: string,
  metric: HaeMetric,
): number {
  const mode = AGGREGATION[column]
  let applied = 0
  for (const point of metric.data ?? []) {
    if (point.date == null || point.qty == null) continue
    const date = localDate(point.date)
    if (date == null) continue
    const value =
      column === 'active_kcal' ? toKcal(point.qty, metric.units) : point.qty

    const patch = byDate.get(date) ?? {}
    const prev = patch[column]
    if (mode === 'sum' && typeof prev === 'number') {
      patch[column] = prev + value
    } else {
      patch[column] = value
    }
    byDate.set(date, patch)
    applied++
  }
  return applied
}

function applySleep(byDate: Map<string, DayPatch>, metric: HaeMetric): number {
  let applied = 0
  for (const point of metric.data ?? []) {
    if (!point.sleepStart || !point.sleepEnd) continue
    const start = toIso(point.sleepStart)
    const end = toIso(point.sleepEnd)
    if (!start || !end) continue

    // 行の date は起床日
    const date = localDate(point.sleepEnd)
    if (date == null) continue

    // DB の CHECK 制約（0 < 差 < 24h）に触れるものは捨てる
    const ms = new Date(end).getTime() - new Date(start).getTime()
    if (!(ms > 0 && ms < 24 * 3600_000)) continue

    const patch = byDate.get(date) ?? {}
    patch.sleep_start = start
    patch.sleep_end = end
    byDate.set(date, patch)
    applied++
  }
  return applied
}

/** 整数列は丸める。numeric の体重だけ小数第1位まで残す */
function normalize(patch: DayPatch): DayPatch {
  const out: DayPatch = { ...patch }
  for (const key of ['steps', 'active_kcal', 'exercise_min', 'stand_hours']) {
    if (typeof out[key] === 'number') out[key] = Math.round(out[key] as number)
  }
  if (typeof out.weight_kg === 'number') {
    out.weight_kg = Math.round((out.weight_kg as number) * 10) / 10
  }
  // stand_hours は 0-24 の CHECK があるので念のため丸める
  if (typeof out.stand_hours === 'number') {
    out.stand_hours = Math.min(24, Math.max(0, out.stand_hours as number))
  }
  return out
}

async function upsert(rows: Record<string, unknown>[]): Promise<void> {
  // PostgREST は配列 UPSERT で全要素が同じキー構成であることを要求するので
  // 1日ずつ投げる（1日1リクエストなら日ごとに違う指標が来ても崩れない）
  for (const row of rows) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_logs?on_conflict=date`,
      {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(row),
      },
    )
    if (!res.ok) {
      throw new Error(`upsert ${row.date} failed: ${res.status} ${await res.text()}`)
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  if (!IMPORT_SECRET) {
    return new Response(
      JSON.stringify({ error: 'HEALTH_IMPORT_SECRET が未設定' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
  const provided =
    req.headers.get('x-api-key') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (provided !== IMPORT_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  let body: { data?: { metrics?: HaeMetric[] } }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON として読めない' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const metrics = body.data?.metrics ?? []
  const byDate = new Map<string, DayPatch>()
  const handled: string[] = []
  const ignored: string[] = []

  for (const metric of metrics) {
    const name = metric.name?.toLowerCase()
    if (!name) continue

    if (SLEEP_METRICS.includes(name)) {
      const n = applySleep(byDate, metric)
      ;(n > 0 ? handled : ignored).push(`${name}(${n})`)
      continue
    }

    const column = Object.keys(METRIC_ALIASES).find((col) =>
      METRIC_ALIASES[col].includes(name),
    )
    if (!column) {
      // 未知の指標は握りつぶさず、レスポンスに出して気づけるようにする
      ignored.push(name)
      continue
    }
    const n = applyMetric(byDate, column, metric)
    ;(n > 0 ? handled : ignored).push(`${name}(${n})`)
  }

  const rows = [...byDate.entries()]
    .map(([date, patch]) => ({ date, ...normalize(patch) }))
    // date だけの行は送っても意味がない（空行を作るだけ）
    .filter((row) => Object.keys(row).length > 1)

  try {
    await upsert(rows)
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e), handled, ignored }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      days: rows.length,
      dates: rows.map((r) => r.date),
      handled,
      ignored,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
