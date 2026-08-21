# ENTITY_API.md — Entity 用 Supabase 書き込みマニュアル

Entity（Mac mini 上の OpenClaw エージェント）が Entity Dock のデータベースに読み書きするための運用マニュアル。
**このドキュメントのコマンドはそのまま実行できる。** 置き換えが必要なのは `$SUPABASE_URL` と `$SUPABASE_SERVICE_ROLE_KEY` の 2 つの環境変数だけ。

---

## 1. 概要

### データフロー

```
れおん ──LINE──▶ Entity (Mac mini)
                    │  写真・数値・文章をパース
                    │  service_role キーで REST API を叩く
                    ▼
              Supabase (Postgres + Storage)
                    │
                    ▼
      Web アプリ https://entity-dock-726eca88ebac.netlify.app
```

- Entity が受け取るもの: 食事の写真、紙のトレーニングノートの写真、体重の数値、Apple Watch のアクティビティリングのスクショ、日記の一言。
- Entity が書き込む先: `daily_logs` / `meals` / `workouts` の 3 テーブルと Storage バケット `photos`。
- Web アプリ側も同じテーブルを直接編集する。**Entity と Web は同じ行を奪い合う可能性がある**ので、`daily_logs` は必ず部分 UPSERT（§4）で書く。

### プロジェクト

| 項目 | 値 |
|---|---|
| Supabase project ref | `qnxtxnrzsbzjxejtmvtr` |
| Project URL | `https://qnxtxnrzsbzjxejtmvtr.supabase.co` |
| REST エンドポイント | `https://qnxtxnrzsbzjxejtmvtr.supabase.co/rest/v1` |
| Storage エンドポイント | `https://qnxtxnrzsbzjxejtmvtr.supabase.co/storage/v1` |
| Web アプリ | `https://entity-dock-726eca88ebac.netlify.app` |
| タイムゾーン | JST（Asia/Tokyo）。ユーザーは 1 人（れおん）のみ |

### 唯一の絶対ルール

> ⚠️ **`service_role` キーは RLS を完全にバイパスする。**
> このキーを持つ者は全テーブルを無制限に読み書き・削除できる。
> - Mac mini の `~/.entity-dock.env`（`chmod 600`）の外に出さない。
> - LINE のメッセージに貼らない。ログに出さない。git に入れない。Netlify の環境変数に入れない。
> - curl のエラー出力をそのまま LINE に転送しない（リクエストヘッダが混ざる可能性がある）。エラーはレスポンス body だけを転送する。

### 認証について

このアプリは**ログインを持たない設計**（オーナーの判断）。したがって:

- **`user_id` カラムは存在しない。** 送ると `PGRST204 / column "user_id" does not exist` で失敗する。絶対に送らないこと。
- 認証トークンの取得も不要。`service_role` キーをそのまま `Authorization: Bearer` に入れる。

---

## 2. 環境変数の準備

### `~/.entity-dock.env`

既存の 2 つに加えて、以下 2 行を追記する。

```bash
# ~/.entity-dock.env  (chmod 600)
SUPABASE_ACCESS_TOKEN=sbp_...          # 既存（Management API 用）
NETLIFY_AUTH_TOKEN=...                 # 既存

SUPABASE_URL=https://qnxtxnrzsbzjxejtmvtr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

パーミッションを確認する。

```bash
chmod 600 ~/.entity-dock.env
ls -l ~/.entity-dock.env    # -rw------- になっていること
```

### service_role キーの入手場所

1. https://supabase.com/dashboard/project/qnxtxnrzsbzjxejtmvtr/settings/api を開く。
2. **Project API keys** の中の `service_role` / `secret` 行の **Reveal** を押してコピーする。
   （新しいダッシュボードでは **Settings → API Keys → Legacy API keys** の下にある。）
3. `anon` / `public` キーと取り違えないこと。`anon` キーでも RLS が全許可なので書き込めてしまうが、
   将来ログインを付けたときに一斉に壊れる。**Entity は必ず `service_role` を使う。**

### シェルへの読み込み

すべてのスクリプトの先頭でこれを実行する。

```bash
set -a; source ~/.entity-dock.env; set +a
```

### 疎通テスト（HTTP ステータスだけ出力）

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/daily_logs?select=date&limit=1"
```

| 出力 | 意味 |
|---|---|
| `200` | 正常。以降の手順に進んでよい |
| `401` | キーが違う / 空。`~/.entity-dock.env` を確認 |
| `404` | URL が違う。`/rest/v1/` が抜けているか project ref が違う |
| `000` | ネットワーク到達不可 |

Storage 側の疎通も一応見ておく。

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":1}' \
  "$SUPABASE_URL/storage/v1/object/list/photos"
```

`200` が返れば OK。

---

## 3. 共通ヘッダ

PostgREST（`/rest/v1/*`）への全リクエストに必要なヘッダ。

```
apikey: $SUPABASE_SERVICE_ROLE_KEY
Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
Content-Type: application/json        ← body を送るとき（POST / PATCH）のみ
```

`apikey` と `Authorization` は**両方**必要。片方だけだと 401 になる。

### `Prefer` ヘッダの使い分け

| 値 | いつ使うか | 効果 |
|---|---|---|
| （付けない） | 通常の INSERT | `201 Created` + 空 body。最速 |
| `return=representation` | 挿入結果を確認したい / `meals`・`workouts` の `id` が欲しい | `201` + 挿入された行の JSON 配列 |
| `resolution=merge-duplicates` | **`daily_logs` への POST では必ず** | 主キー衝突時に UPDATE に切り替える（= UPSERT） |
| `count=exact` | 件数を知りたい GET | `Content-Range: 0-4/23` のように総件数が返る |

複数指定はカンマ区切りで 1 本にまとめる。

```
Prefer: resolution=merge-duplicates,return=representation
```

> ⚠️ `daily_logs` に `Prefer: resolution=merge-duplicates` **なし**で POST すると、
> 既存行があれば `409 Conflict` (`23505 duplicate key value violates unique constraint "daily_logs_pkey"`) になる。
> 「今日の記録がまだ無いから INSERT で行ける」という判断はしない。**常に UPSERT で書く。**

---

## 4. `daily_logs` への UPSERT（最重要）

### なぜ部分 UPSERT なのか

れおんは 1 日の中でバラバラのタイミングで報告してくる。

```
07:20  「62.4」                        → weight_kg
07:25  「23:40に寝て7:10起き、スコア82」  → sleep_start / sleep_end / sleep_score
12:00  「瞑想15分やった」                → meditation_min
22:30  「今日は体調8、気分7」             → condition_score / mood
23:00  Apple Watch のスクショ            → steps / active_kcal / exercise_min / stand_hours
23:10  「今日は集中できた日だった」        → diary
```

`daily_logs` は **1 日 1 行（PK = `date`）**。上の 6 回はすべて同じ行を更新する。

> ⚠️ **後の報告が前の報告を消してはいけない。**
> 22:30 の体調報告のときに `weight_kg: null` を含む payload を送ると、朝に記録した 62.4 が **静かに消える**。
> エラーは出ない。気づくのは数日後にグラフの穴を見つけたときになる。
> **payload には `date` と「今まさに報告された項目」だけを入れる。他のカラムのキー自体を書かない。**

### 仕組み

PostgREST の UPSERT は、**payload の JSON に含まれるキーだけ**を `ON CONFLICT DO UPDATE SET` の対象にする。生成される SQL は概ねこうなる。

```sql
-- {"date":"2026-08-19","weight_kg":62.4} を送った場合
insert into daily_logs (date, weight_kg) values ('2026-08-19', 62.4)
on conflict (date) do update set weight_kg = excluded.weight_kg;
-- ← sleep_start や diary は SET 句に現れないので、既存値がそのまま残る
```

つまり:

- **キーを書かない** → その列は触られない（既存値が残る）✅
- **`"weight_kg": null` と書く** → その列は `NULL` で上書きされる ⚠️
- 明示的に消したいとき（誤記録の取り消し）だけ `null` を送る。

payload は **1 個のオブジェクト**を送る。複数日をまとめて配列で送ると、PostgREST は全要素が同じキー構成であることを要求する（違うと `PGRST102`）。**1 リクエスト 1 行**にしておけば悩まない。

### 基本形

```
POST $SUPABASE_URL/rest/v1/daily_logs?on_conflict=date
Prefer: resolution=merge-duplicates
```

`?on_conflict=date` は省略しても PK が使われるが、**必ず明示する**（意図が読めるし、将来カラムが増えても壊れない）。

### 4.1 体重だけ報告

```bash
set -a; source ~/.entity-dock.env; set +a

curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{"date":"2026-08-19","weight_kg":62.4}'
```

`weight_kg` は `numeric(5,2)`。小数第 2 位まで。`62.437` を送ると `62.44` に丸められる。

### 4.2 睡眠だけ報告

時刻の作り方は §5 を必ず読むこと。ここでは完成した値を使う。

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "date": "2026-08-19",
    "sleep_start": "2026-08-18T23:40:00+09:00",
    "sleep_end":   "2026-08-19T07:10:00+09:00",
    "sleep_score": 82
  }'
```

睡眠スコアが報告されていないなら `sleep_score` のキーごと省く。`"sleep_score": null` にしない。

### 4.3 体調・気分・瞑想

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{"date":"2026-08-19","condition_score":8,"mood":7,"meditation_min":15}'
```

`condition_score` と `mood` は **1〜10**（0 は不可）。`meditation_min` は 0 以上の整数（分）。
「瞑想しなかった」と明言された日は `0` を入れてよい。何も言われていない日は**キーごと送らない**。

### 4.4 Apple Watch の活動量

スクショから 4 つの数字を読む。

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "date": "2026-08-19",
    "steps": 9421,
    "active_kcal": 512,
    "exercise_min": 43,
    "stand_hours": 11
  }'
```

| 項目 | リング / 表示 | 型・制約 |
|---|---|---|
| `active_kcal` | ムーブ（赤） | integer, `>= 0`。**総消費でなくアクティブカロリー** |
| `exercise_min` | エクササイズ（黄緑） | smallint, `>= 0`（分） |
| `stand_hours` | スタンド（水色） | smallint, **0〜24**。`11/12` のような表示なら分子の `11` |
| `steps` | 歩数 | integer, `>= 0`。リングではなくアクティビティ詳細から |

スクショに写っていない項目は送らない。読み取りに自信がない数字は、送る前にれおんに確認する。

### 4.5 日記

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{"date":"2026-08-19","diary":"午前に集中できた。夕方から少しだるい。明日は早めに寝る。"}'
```

- `diary` は `text`。長さ制限なし。改行は JSON の `\n` で入れる。
- **追記したいときは既存の `diary` を GET してから連結して送る。** UPSERT は列を丸ごと置換するので、追記機能はない。

```bash
# 既存の日記に 1 行足す例
OLD=$(curl -sS "$SUPABASE_URL/rest/v1/daily_logs?date=eq.2026-08-19&select=diary" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq -r '.[0].diary // ""')

ADD="夜、追記：やっぱり眠い。"
if [ -z "$OLD" ]; then NEW="$ADD"; else NEW="$OLD"$'\n'"$ADD"; fi

jq -n --arg d 2026-08-19 --arg diary "$NEW" '{date:$d, diary:$diary}' \
| curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates" \
    --data-binary @-
```

### 4.6 マージの検証（自分で確かめる）

同じ日付に 2 回、別々の項目を送って結果を見る。**このテストは初回セットアップ時に一度実行して、マージ挙動を自分の目で確認しておくこと。**

**1 回目 — 朝の体重報告**

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{"date":"2026-08-19","weight_kg":62.4}'
```

レスポンス:

```json
[
  {
    "date": "2026-08-19",
    "weight_kg": "62.40",
    "sleep_start": null,
    "sleep_end": null,
    "sleep_score": null,
    "meditation_min": null,
    "condition_score": null,
    "mood": null,
    "steps": null,
    "active_kcal": null,
    "exercise_min": null,
    "stand_hours": null,
    "diary": null,
    "updated_at": "2026-08-19T07:20:11.482Z"
  }
]
```

**2 回目 — 夜の体調報告（`weight_kg` はキーごと入っていない）**

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{"date":"2026-08-19","condition_score":8,"mood":7}'
```

レスポンス:

```json
[
  {
    "date": "2026-08-19",
    "weight_kg": "62.40",
    "sleep_start": null,
    "sleep_end": null,
    "sleep_score": null,
    "meditation_min": null,
    "condition_score": 8,
    "mood": 7,
    "steps": null,
    "active_kcal": null,
    "exercise_min": null,
    "stand_hours": null,
    "diary": null,
    "updated_at": "2026-08-19T22:30:03.917Z"
  }
]
```

**`weight_kg` が `"62.40"` のまま残っている**ことを確認する。ここが `null` になっていたら payload に余計なキーが入っている。

参考: `weight_kg` は `numeric` なので JSON では**文字列**として返る（`"62.40"`）。数値として使うときはパースすること。

**やってはいけない例**

```json
{ "date": "2026-08-19", "condition_score": 8, "mood": 7, "weight_kg": null, "diary": null }
```

これは朝の体重と昨夜書いた日記を消す。`null` は「消せ」という明示的な命令。

### `daily_logs` カラム一覧

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `date` | `date` | **PK** | `YYYY-MM-DD`。JST の日付。睡眠については**起床日** |
| `weight_kg` | `numeric(5,2)` | `> 0 and < 300` | kg |
| `sleep_start` | `timestamptz` | — | 就寝時刻。§5 参照 |
| `sleep_end` | `timestamptz` | — | 起床時刻。§5 参照 |
| `sleep_score` | `smallint` | `0〜100` | **0 も有効**（他のスコアと違う） |
| `meditation_min` | `smallint` | `>= 0` | 分 |
| `condition_score` | `smallint` | `1〜10` | 体調 |
| `mood` | `smallint` | `1〜10` | 気分 |
| `steps` | `integer` | `>= 0` | 歩数 |
| `active_kcal` | `integer` | `>= 0` | アクティブカロリー |
| `exercise_min` | `smallint` | `>= 0` | 分 |
| `stand_hours` | `smallint` | `0〜24` | 時間 |
| `diary` | `text` | — | |
| `updated_at` | `timestamptz` | 自動 | トリガで更新。**送らない** |

`sleep_range` 制約: `sleep_end > sleep_start` かつ差が 24 時間未満。

---

## 5. 睡眠時刻の作り方

ここが一番間違えやすい。

### ルール

1. **行の `date` は「起床日」。** 「昨日 23:40 に寝て今朝 7:10 に起きた」なら、行は**今日**の日付。
2. 入力は 2 つの時計時刻（就寝 / 起床）だけ。日付は入力に含まれない。
3. **就寝 > 起床（文字列比較で）なら、就寝は前日**。例: `23:40 > 07:10` → 就寝は前日。
4. 就寝 < 起床なら**同じ日**。例: `01:00 < 08:00` → 両方とも起床日。
5. `sleep_start == sleep_end` は制約違反。どちらかを直すか、れおんに聞き直す。
6. タイムスタンプは **`+09:00` オフセット付き**で送る（推奨）。UTC (`Z`) で送るなら 9 時間引いた正しい値にすること。

> ⚠️ **オフセットなしの `"2026-08-19T07:10:00"` を送ってはいけない。**
> Postgres はサーバのタイムゾーン（UTC）として解釈するので、**9 時間ずれた**時刻が保存される。
> エラーは出ない。Web アプリが「22:10 に起床」と表示して初めて気づくことになる。
> **必ず `+09:00` を付ける。**

### 変換スクリプト（Python / 推奨）

`~/entity/bin/sleep_ts.py` として置く。標準ライブラリのみ。

```python
#!/usr/bin/env python3
"""usage: sleep_ts.py <起床日 YYYY-MM-DD> <就寝 HH:MM> <起床 HH:MM>"""
import json
import sys
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))

date_s, bed_s, wake_s = sys.argv[1], sys.argv[2], sys.argv[3]
d = datetime.strptime(date_s, "%Y-%m-%d").date()
bh, bm = (int(x) for x in bed_s.split(":"))
wh, wm = (int(x) for x in wake_s.split(":"))

end = datetime(d.year, d.month, d.day, wh, wm, tzinfo=JST)      # 起床 = 起床日
start = datetime(d.year, d.month, d.day, bh, bm, tzinfo=JST)    # 就寝
if start >= end:                                                # 日付をまたいだ
    start -= timedelta(days=1)

dur = end - start
if not (timedelta(0) < dur < timedelta(hours=24)):
    sys.exit(f"ERROR: 睡眠時間が不正です ({dur})")

print(json.dumps({
    "date": date_s,
    "sleep_start": start.isoformat(),
    "sleep_end": end.isoformat(),
}, ensure_ascii=False))
```

使い方:

```bash
chmod +x ~/entity/bin/sleep_ts.py
~/entity/bin/sleep_ts.py 2026-08-19 23:40 07:10
# {"date": "2026-08-19", "sleep_start": "2026-08-18T23:40:00+09:00", "sleep_end": "2026-08-19T07:10:00+09:00"}
```

そのまま UPSERT に流し込む（睡眠スコアも一緒に入れる例）:

```bash
~/entity/bin/sleep_ts.py 2026-08-19 23:40 07:10 \
| jq '. + {sleep_score: 82}' \
| curl -sS -X POST "$SUPABASE_URL/rest/v1/daily_logs?on_conflict=date" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=representation" \
    --data-binary @-
```

スコアの報告がなければ `jq` の行を外す。

### 変換関数（bash / 簡易版）

macOS の BSD `date` 前提。`HH:MM` はゼロ埋めされているので文字列比較で判定できる。

```bash
sleep_ts() {   # $1=起床日 $2=就寝HH:MM $3=起床HH:MM
  local wake_day=$1 bed=$2 wake=$3 bed_day=$1
  [[ "$bed" == "$wake" ]] && { echo "ERROR: 就寝と起床が同時刻" >&2; return 1; }
  if [[ "$bed" > "$wake" ]]; then
    bed_day=$(date -j -v-1d -f '%Y-%m-%d' "$wake_day" '+%Y-%m-%d')
  fi
  echo "${bed_day}T${bed}:00+09:00 ${wake_day}T${wake}:00+09:00"
}

sleep_ts 2026-08-19 23:40 07:10
# 2026-08-18T23:40:00+09:00 2026-08-19T07:10:00+09:00
```

### 検算例

| 起床日 (`date`) | 就寝 | 起床 | 判定 | `sleep_start` | `sleep_end` | 睡眠時間 |
|---|---|---|---|---|---|---|
| `2026-08-19` | 23:40 | 07:10 | 就寝 > 起床 → **前日** | `2026-08-18T23:40:00+09:00` | `2026-08-19T07:10:00+09:00` | 7h30m |
| `2026-08-20` | 01:00 | 08:00 | 就寝 < 起床 → **同日** | `2026-08-20T01:00:00+09:00` | `2026-08-20T08:00:00+09:00` | 7h00m |
| `2026-08-21` | 22:15 | 05:45 | 就寝 > 起床 → **前日** | `2026-08-20T22:15:00+09:00` | `2026-08-21T05:45:00+09:00` | 7h30m |

UTC で送る場合の同値（どちらで送っても DB 上は同じ瞬間）:

| JST | UTC |
|---|---|
| `2026-08-18T23:40:00+09:00` | `2026-08-18T14:40:00Z` |
| `2026-08-19T07:10:00+09:00` | `2026-08-18T22:10:00Z` |
| `2026-08-20T01:00:00+09:00` | `2026-08-19T16:00:00Z` |

**迷ったら `+09:00` 形式で送る。** 手で UTC に変換しない。

### 昼寝・仮眠

このスキーマは 1 日 1 睡眠しか持てない。昼寝は記録しない（またはれおんに `diary` へ書くよう促す）。
「今日 3 時間しか寝てない」のような報告は、就寝・起床時刻を聞き返してから記録する。

---

## 6. 食事の記録（写真つき）

3 ステップ。**(a) パス生成 → (b) Storage にアップロード → (c) `meals` に INSERT。**

> ⚠️ **`photo_url` には Storage の「オブジェクトパス」を入れる。URL でも署名 URL でもない。**
> 正しい: `meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg`
> 誤り: `https://qnxtxnrzsbzjxejtmvtr.supabase.co/storage/v1/object/...`（署名 URL は 1 時間で失効し、写真が永久に表示されなくなる）
> 誤り: `photos/meals/2026/08/....jpg`（**バケット名 `photos` は含めない**。アップロードのレスポンスに含まれる `Key` はバケット名込みなので、そのまま使うと二重になる）
>
> Web アプリは表示のたびに `photo_url` から署名 URL を作る（TTL 1 時間）。DB に URL を保存するとこの仕組みが壊れる。

### バケット `photos` の仕様

| 項目 | 値 |
|---|---|
| バケット名 | `photos` |
| 公開設定 | **private**（直リンク不可。署名 URL 必須） |
| サイズ上限 | **10 MB** (10485760 bytes) |
| 許可 MIME | `image/jpeg`, `image/png`, `image/webp` |
| パス規約（食事） | `meals/YYYY/MM/<uuid>.jpg` |
| パス規約（筋トレ） | `workouts/YYYY/MM/<uuid>.jpg` |

`YYYY` / `MM` は**その記録の `date`** の年月（アップロード日ではない）。過去日を後から記録するときに間違えやすい。

### (a) パス生成と画像の準備

```bash
set -a; source ~/.entity-dock.env; set +a

DATE=$(TZ=Asia/Tokyo date +%F)            # 2026-08-19（過去日の記録ならここを手で指定）
MEAL_TIME=$(TZ=Asia/Tokyo date +%H:%M:%S) # 12:41:03
YEAR=${DATE:0:4}
MONTH=${DATE:5:2}
UUID=$(uuidgen | tr 'A-Z' 'a-z')
OBJ_PATH="meals/$YEAR/$MONTH/$UUID.jpg"   # ← DB に入れるのはこの文字列

SRC=~/entity/inbox/line-photo.png         # LINE から落とした元ファイル
JPG=/tmp/entity-$UUID.jpg

# JPEG に変換 + 長辺 2000px に縮小（LINE の画像は PNG / HEIC のことがある）
sips -s format jpeg -Z 2000 "$SRC" --out "$JPG" >/dev/null

# 10MB 上限チェック（縮小後はまず超えないが、念のため）
if [ "$(stat -f%z "$JPG")" -ge 10485760 ]; then
  sips -s formatOptions 60 "$JPG" --out "$JPG" >/dev/null   # 画質を落として再圧縮
fi
echo "$OBJ_PATH ($(stat -f%z "$JPG") bytes)"
```

変数名に `PATH` を使わないこと（シェルの実行パスを壊す）。`OBJ_PATH` を使う。

### (b) Storage へアップロード

```bash
curl -sS -X POST \
  "$SUPABASE_URL/storage/v1/object/photos/$OBJ_PATH" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/jpeg" \
  -H "cache-control: max-age=3600" \
  --data-binary "@$JPG"
```

成功レスポンス（`200`）:

```json
{"Key":"photos/meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg","Id":"c3a1..."}
```

`Key` にはバケット名 `photos/` が付いている。**DB に入れるのはこれではなく `$OBJ_PATH`。**

- `Content-Type` はファイルの実体と一致させる（`image/jpeg` / `image/png` / `image/webp`）。それ以外は拒否される。
- 同じパスへの 2 回目の POST は `409 Duplicate`。uuid は毎回新しく生成するので通常起きない。上書きしたいときだけ `-H "x-upsert: true"` を足す。

### (c) `meals` に INSERT

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/meals" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "date": "2026-08-19",
    "time": "12:41:00",
    "meal_type": "lunch",
    "photo_url": "meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg",
    "description": "鶏むね肉のグリル、玄米、ブロッコリー、味噌汁。自炊。",
    "tags": ["自炊", "高たんぱく", "和食"],
    "source": "entity"
  }'
```

変数を使って組み立てる場合は `jq` で安全に JSON 化する（説明文に `"` や改行が入るため）。

```bash
jq -n \
  --arg date "$DATE" --arg time "$MEAL_TIME" --arg mt "lunch" \
  --arg path "$OBJ_PATH" \
  --arg desc "鶏むね肉のグリル、玄米、ブロッコリー、味噌汁。自炊。" \
  --argjson tags '["自炊","高たんぱく","和食"]' \
  '{date:$date, time:$time, meal_type:$mt, photo_url:$path,
    description:$desc, tags:$tags, source:"entity"}' \
| curl -sS -X POST "$SUPABASE_URL/rest/v1/meals" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    --data-binary @-
```

### `meals` カラム一覧

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | `uuid` | 自動 | `gen_random_uuid()`。**送らない** |
| `date` | `date` | **必須** | `YYYY-MM-DD` |
| `time` | `time` | 任意 | `'HH:MM:SS'`。**日付なし・タイムゾーンなし**。JST の時計時刻をそのまま入れる |
| `meal_type` | `text` | **必須** | `breakfast` / `lunch` / `dinner` / `snack` のみ |
| `photo_url` | `text` | 任意 | オブジェクトパス。写真なしなら省略 |
| `description` | `text` | 任意 | 内容の説明 |
| `tags` | `text[]` | 任意 | JSON 配列で送る。省略時は `{}` |
| `source` | `text` | **`"entity"`** | Entity が書くものは必ず `entity` |
| `created_at` | `timestamptz` | 自動 | **送らない** |

> `source` を省略するとデフォルトの `'web'` になり、Web アプリの **ENTITY バッジが出ない**。れおんが「これ自分で入れたっけ？」と混乱する。**毎回明示的に `"source": "entity"` を入れる。**

### `time` は「写真が届いた時刻」

> ⚠️ **食事の時刻は、れおんが LINE で写真を送ってきた時刻をそのまま使う。**
> 写真の EXIF や、料理から推測した時刻を使わない。れおんは食べたその場で送るので、
> 受信時刻が実際の食事時刻に一番近い。

```bash
# 受信を検知した時点で時刻を確定させる。
# 解析や画像アップロードに時間がかかるので、後から now を取ると数分ずれる。
MEAL_TIME=$(date +%H:%M:%S)
MEAL_DATE=$(date +%F)
```

補足:

- 過去分をまとめて送ってきた場合（「昨日の夜の分」）は、**言われた内容を優先**して
  `date` と `time` を遡らせる。分からなければ聞き返す。
- 時刻が分からない過去分は `time` を `null` にしてよい。`date` だけは必ず入れる。

### `meal_type` の推定ルール

`time`（= 写真が届いた時刻）から機械的に決める。

| 時刻 | `meal_type` | 表示 |
|---|---|---|
| `< 10:00` | `breakfast` | 朝食 |
| `< 15:00` | `lunch` | 昼食 |
| `< 21:00` | `dinner` | 夕食 |
| それ以外（21:00 以降） | `snack` | 間食 |

例外:

- れおんが「間食」「おやつ」「夜食」と言っていたら、時刻に関係なく `snack`。
- 「昨日の夜の分」のように過去を指していたら、時刻ではなく**言われた食事**で判断し、`date` も遡らせる。
- 深夜 0〜4 時の写真はルール上 `breakfast` になるが、実態はほぼ夜食。`snack` にするか、れおんに一言確認する。

### `description` の書き方

Dashboard で後から読み返して意味がわかる粒度で書く。

- 主な食材・料理名を列挙する。「ランチ」「ごはん」だけでは無価値。
- おおよその量がわかるなら書く（「玄米 1 膳」「鶏むね 200g くらい」）。
- 写真から読めない情報を勝手に創作しない。わからないものは「（判別不能）」と書くか、れおんに聞く。
- れおんが文章を添えていたら、それを優先して取り込む。

良い例: `鶏むね肉のグリル、玄米、ブロッコリー、味噌汁。自炊。`
悪い例: `健康的でバランスの良い食事です。`

### `tags` の付け方

> ⚠️ **Dashboard はタグごとに体調スコアの平均を集計する。**
> 同じ意味に毎回違う語を当てると（`外食` / `外で食べた` / `レストラン` / `お店`）、
> どれもサンプル数 1〜2 になり、**集計が完全に無意味になる**。
> **タグは毎日使い回す固定語彙**であって、感想欄ではない。

**基本語彙（この中から選ぶ）**

| 分類 | タグ |
|---|---|
| 調理形態 | `自炊` `外食` `コンビニ` `惣菜` `デリバリー` |
| 栄養傾向 | `高たんぱく` `高脂質` `高糖質` `野菜多め` `低カロリー` |
| 調理法 | `揚げ物` `焼き` `煮込み` `生` |
| ジャンル | `和食` `洋食` `中華` `エスニック` |
| その他 | `アルコール` `間食` `プロテイン` `サプリ` |

- 1 食あたり **2〜4 個**。付けすぎると集計がぼやける。
- 新しいタグを作る前に、既存タグで表現できないか必ず考える。
- どうしても新語彙が必要なら、**一度れおんに確認してからこのリストに追記する**（このファイルを更新する）。
- 既存タグの確認:

```bash
curl -sS "$SUPABASE_URL/rest/v1/meals?select=tags&limit=1000" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
| jq -r '.[].tags[]' | sort | uniq -c | sort -rn
```

### 訂正・削除

`meals` には UPSERT のキーがない（`id` は毎回新規）。**同じ curl を 2 回実行すると行が 2 つできる。** 失敗したように見えても、レスポンスを確認してから再送すること。

```bash
# 訂正（id 指定の PATCH）
curl -sS -X PATCH "$SUPABASE_URL/rest/v1/meals?id=eq.9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"meal_type":"snack","tags":["間食","高糖質"]}'

# 削除（写真は別途消す。順序は「行 → 写真」）
curl -sS -X DELETE "$SUPABASE_URL/rest/v1/meals?id=eq.9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

curl -sS -X DELETE "$SUPABASE_URL/storage/v1/object/photos/meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

> `?id=eq....` のようなフィルタを**必ず**付けること。付け忘れた DELETE / PATCH は全行に効く。
> （PostgREST はフィルタなしの DELETE を拒否しない。`service_role` なので RLS も止めてくれない。）

---

### 6.5 栄養の推定（重要）

食事を記録するときは、写真と内容から **kcal / P / F / C を概算して必ず入れる**。
Web アプリの FUEL タブはこの4つで栄養ダッシュボードを描く。入っていない食事は
「栄養未算出」として合計から外れ、画面が空になる。

| 列 | 型 | 内容 |
|---|---|---|
| `kcal` | integer | 概算カロリー |
| `protein_g` | numeric(5,1) | たんぱく質 (g) |
| `fat_g` | numeric(5,1) | 脂質 (g) |
| `carb_g` | numeric(5,1) | 炭水化物 (g) |

⚠️ **厳密さは求めていない。** れおんが見たいのは絶対値ではなく積み上がりと傾向。
分からない栄養素は `null` のままでよいが、**全部 null にはしないこと**。
写真から量が読めないときは、一般的な一人前を仮定して概算を入れる。

推定の目安（1人前）:

| 食品 | kcal | P | F | C |
|---|---|---|---|---|
| 白米 150g | 250 | 4 | 0.5 | 55 |
| 鶏むね肉 200g（皮なし） | 220 | 46 | 3 | 0 |
| 卵 1個 | 75 | 6 | 5 | 0.5 |
| プロテイン 1杯 | 120 | 24 | 2 | 3 |
| サーモン 100g | 200 | 20 | 13 | 0 |
| ブロッコリー 100g | 35 | 4 | 0.4 | 7 |
| 牛ステーキ 200g | 500 | 40 | 36 | 0 |

複数の食材が写っていれば足し合わせる。油や調味料は 50-100 kcal 程度上乗せする。

完全な例:

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/meals" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "date": "2026-08-20",
    "time": "19:20:00",
    "meal_type": "dinner",
    "photo_url": "meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg",
    "description": "牛ステーキ200g、白米150g、ブロッコリー。自炊。",
    "tags": ["自炊", "高たんぱく"],
    "kcal": 830,
    "protein_g": 48,
    "fat_g": 37,
    "carb_g": 62,
    "source": "entity"
  }'
```

---

## 7. トレーニングの記録

れおんは紙のトレーニングノートを写真で送ってくる。フローは食事と同じ 3 ステップ、テーブルが `workouts` になるだけ。

### (a)(b) パス生成とアップロード

```bash
set -a; source ~/.entity-dock.env; set +a

DATE=$(TZ=Asia/Tokyo date +%F)
YEAR=${DATE:0:4}; MONTH=${DATE:5:2}
UUID=$(uuidgen | tr 'A-Z' 'a-z')
OBJ_PATH="workouts/$YEAR/$MONTH/$UUID.jpg"

SRC=~/entity/inbox/notebook.jpg
JPG=/tmp/entity-$UUID.jpg
sips -s format jpeg -Z 2400 "$SRC" --out "$JPG" >/dev/null   # 文字を読むので少し大きめ

curl -sS -X POST "$SUPABASE_URL/storage/v1/object/photos/$OBJ_PATH" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@$JPG"
```

### (c) `workouts` に INSERT

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/workouts" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "date": "2026-08-19",
    "photo_url": "workouts/2026/08/4b7e2d10-8c33-4f0a-b21d-6e9a0c4f5d88.jpg",
    "menu": "ベンチプレス 80kg 3×8\nインクラインダンベルプレス 26kg 3×10\nケーブルフライ 15kg 3×12\nディップス 自重 3×12",
    "notes": "ベンチ最終セット7レップで潰れた。先週より+2.5kg。肩の違和感なし。",
    "tags": ["胸", "腕"],
    "source": "entity"
  }'
```

### `workouts` カラム一覧

| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | `uuid` | 自動 | **送らない** |
| `date` | `date` | **必須** | `YYYY-MM-DD` |
| `photo_url` | `text` | 任意 | オブジェクトパス（`workouts/YYYY/MM/<uuid>.jpg`） |
| `menu` | `text` | 任意 | ノートの書き起こし。プレーンテキスト |
| `notes` | `text` | 任意 | 感想・調子・気づき |
| `tags` | `text[]` | 任意 | 部位 |
| `source` | `text` | **`"entity"`** | |
| `created_at` | `timestamptz` | 自動 | **送らない** |

`workouts` には `time` カラムがない。時刻を残したいなら `notes` に書く。

### `menu` の書き起こし規約

1 行 1 種目。**`種目 重量 セット×レップ`** の順。プレーンテキスト（Markdown の表や箇条書き記号は使わない）。

```
ベンチプレス 80kg 3×8
インクラインダンベルプレス 26kg 3×10
ケーブルフライ 15kg 3×12
ディップス 自重 3×12
```

- 単位は `kg`。自重種目は `自重`。
- セットごとにレップが違う場合はカンマで並べる: `スクワット 100kg 8,8,6`
- 時間種目: `プランク 60秒 3セット`
- JSON に入れるときは改行を `\n` にエスケープする（`jq` を使えば自動）。
- **読めない字は創作しない。** `（判読不能）` と書いて `notes` に「◯行目が読めなかった」と残し、れおんに確認する。数字の読み間違いは記録全体の価値を壊す。

### `tags`（部位）

**この 5 語だけを使う。**

| タグ | 対象種目の例 |
|---|---|
| `胸` | ベンチプレス、ダンベルプレス、フライ、ディップス |
| `背中` | 懸垂、ラットプルダウン、ロー、デッドリフト |
| `脚` | スクワット、レッグプレス、レッグカール、カーフレイズ |
| `肩` | ショルダープレス、サイドレイズ、リアレイズ |
| `腕` | カール、トライセプス系、プレスダウン |

- 複数部位を回した日は複数付ける: `["胸","腕"]`
- 有酸素だけの日は `menu` に書き、タグは空 `[]` にする。`有酸素` のような新語彙を勝手に作らない。
- `胸の日` `プッシュ` `Chest` などの表記ゆれは作らない（食事タグと同じ理由）。

---

## 8. 読み取り

### 共通ヘッダ（GET は `Content-Type` 不要）

```
apikey: $SUPABASE_SERVICE_ROLE_KEY
Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```

### フィルタ構文

| 書き方 | 意味 |
|---|---|
| `?date=eq.2026-08-19` | 一致 |
| `?date=gte.2026-08-10&date=lte.2026-08-16` | 範囲（両端含む） |
| `?weight_kg=not.is.null` | NULL でない |
| `?meal_type=in.(lunch,dinner)` | いずれか |
| `?tags=cs.%7B%E8%87%AA%E7%82%8A%7D` | 配列が `自炊` を含む（`cs.{自炊}` を URL エンコード） |
| `?select=date,weight_kg` | 列の絞り込み |
| `?order=date.desc` / `?order=time.asc` | 並び順 |
| `?limit=30&offset=0` | ページング |

### 「今日なに食べたっけ」

```bash
set -a; source ~/.entity-dock.env; set +a
TODAY=$(TZ=Asia/Tokyo date +%F)

curl -sS "$SUPABASE_URL/rest/v1/meals?date=eq.$TODAY&select=time,meal_type,description,tags,photo_url&order=time.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

```json
[
  {
    "time": "08:12:00",
    "meal_type": "breakfast",
    "description": "オートミール、ゆで卵2個、バナナ。",
    "tags": ["自炊", "高たんぱく"],
    "photo_url": "meals/2026/08/2c8d1a45-...-.jpg"
  },
  {
    "time": "12:41:00",
    "meal_type": "lunch",
    "description": "鶏むね肉のグリル、玄米、ブロッコリー、味噌汁。自炊。",
    "tags": ["自炊", "高たんぱく", "和食"],
    "photo_url": "meals/2026/08/9f1c0b7e-...-.jpg"
  }
]
```

LINE に返す形に整形する例:

```bash
curl -sS "$SUPABASE_URL/rest/v1/meals?date=eq.$TODAY&select=time,meal_type,description&order=time.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
| jq -r '
  {breakfast:"朝食", lunch:"昼食", dinner:"夕食", snack:"間食"} as $L
  | .[] | "\(.time[0:5]) [\($L[.meal_type])] \(.description // "（説明なし）")"'
# 08:12 [朝食] オートミール、ゆで卵2個、バナナ。
# 12:41 [昼食] 鶏むね肉のグリル、玄米、ブロッコリー、味噌汁。
```

### 「先週の平均体重は」

先週 = 直近の月曜〜日曜。2026-08-19（水）時点なら `2026-08-10`（月）〜 `2026-08-16`（日）。

```bash
curl -sS "$SUPABASE_URL/rest/v1/daily_logs?date=gte.2026-08-10&date=lte.2026-08-16&weight_kg=not.is.null&select=date,weight_kg&order=date.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
| jq '[.[].weight_kg | tonumber] | {n: length, avg: (add / length | .*100 | round / 100),
      min: min, max: max}'
# {"n":6,"avg":62.28,"min":61.90,"max":62.70}
```

`weight_kg` は `numeric` なので JSON では文字列（`"62.40"`）。**`tonumber` を忘れない。**

直近 7 日を動的に取る場合（macOS の `date`）:

```bash
FROM=$(TZ=Asia/Tokyo date -v-6d +%F)
TO=$(TZ=Asia/Tokyo date +%F)
curl -sS "$SUPABASE_URL/rest/v1/daily_logs?date=gte.$FROM&date=lte.$TO&select=date,weight_kg,condition_score,sleep_score&order=date.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### その他のよくある問い合わせ

```bash
# 今日の記録状況（何が埋まっていて何が空か）
curl -sS "$SUPABASE_URL/rest/v1/daily_logs?date=eq.$TODAY&select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
| jq '.[0] // {} | to_entries | map(select(.value == null) | .key)'
# ["sleep_score","meditation_min","diary"]  ← 未入力の項目

# 直近のトレーニング 5 件
curl -sS "$SUPABASE_URL/rest/v1/workouts?select=date,menu,tags&order=date.desc&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# 今月「胸」をやった日
curl -sS "$SUPABASE_URL/rest/v1/workouts?date=gte.2026-08-01&date=lte.2026-08-31&tags=cs.%7B%E8%83%B8%7D&select=date&order=date.asc" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# 件数だけ知りたい（Content-Range ヘッダで返る）
curl -sS -D - -o /dev/null "$SUPABASE_URL/rest/v1/meals?date=gte.2026-08-01&select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: count=exact" | grep -i content-range
# content-range: 0-42/43
```

### 写真を LINE に返す（署名 URL の発行）

バケットは private なので、`photo_url` のパスだけでは表示できない。都度署名 URL を発行する。

```bash
OBJ_PATH="meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg"

curl -sS -X POST "$SUPABASE_URL/storage/v1/object/sign/photos/$OBJ_PATH" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}'
```

レスポンス:

```json
{"signedURL":"/object/sign/photos/meals/2026/08/9f1c0b7e-2a44-4a1b-9c0e-3d5f8a7b1e22.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

> ⚠️ **返るのは相対パス。** そのまま LINE に貼っても開けない。
> `$SUPABASE_URL/storage/v1` を前に付けてフル URL にする。

```bash
FULL=$(curl -sS -X POST "$SUPABASE_URL/storage/v1/object/sign/photos/$OBJ_PATH" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}' \
| jq -r '"\(env.SUPABASE_URL)/storage/v1" + (.signedURL // .signedUrl)')
echo "$FULL"
```

- `expiresIn` は秒。Web アプリと揃えて `3600`（1 時間）を使う。
- **署名 URL を DB に保存しない。** 発行して使い捨てる。
- 画像を手元に落としたいだけなら署名は不要で、直接ダウンロードできる。

```bash
curl -sS "$SUPABASE_URL/storage/v1/object/photos/$OBJ_PATH" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -o /tmp/photo.jpg
```

---

## 9. エラー対応表

エラーレスポンスは常に読む。`-sS` を付けておくと進捗バーは消えるがエラーは表示される。
ステータスコードも見たいときは `-w '\n%{http_code}\n'` を足す。

| HTTP | レスポンス例 | 原因 | 対処 |
|---|---|---|---|
| `401` | `{"message":"Invalid API key"}` | キーが誤り / 空 / `apikey` ヘッダ欠落 | `~/.entity-dock.env` を再読込。`anon` キーと取り違えていないか確認。`apikey` と `Authorization` の**両方**を送る |
| `404` | `{"code":"42P01","message":"relation \"public.daily_log\" does not exist"}` | テーブル名の綴り誤り（`daily_log` / `meal` / `workout` は**存在しない**。すべて複数形） | `daily_logs` / `meals` / `workouts` |
| `404` | HTML または `{"message":"Requested path is invalid"}` | URL に `/rest/v1` が無い、または project ref 誤り | `$SUPABASE_URL/rest/v1/<table>` |
| `404` | `{"statusCode":"404","error":"not_found","message":"Object not found"}` | Storage のパス誤り。`photo_url` に `photos/` を含めてしまった等 | バケット名は URL 側 (`/object/photos/`) にだけ入れる。DB には入れない |
| `400` | `{"code":"PGRST204","message":"Could not find the 'user_id' column of 'meals' in the schema cache"}` | **存在しないカラムを送った**（`user_id` は無い） | §4・§6・§7 のカラム一覧にある名前だけを送る |
| `409` | `{"code":"23505","message":"duplicate key value violates unique constraint \"daily_logs_pkey\""}` | `daily_logs` に `Prefer: resolution=merge-duplicates` なしで POST した | `Prefer: resolution=merge-duplicates` と `?on_conflict=date` を付ける（§4） |
| `400` | `{"code":"23514","message":"new row for relation \"daily_logs\" violates check constraint \"daily_logs_weight_kg_check\""}` | CHECK 違反 → 下の表で制約名から原因を特定 | 送る前に範囲を検証する |
| `400` | `{"code":"22P02","message":"invalid input syntax for type date: \"8/19\""}` | 日付形式が不正 | `date` は必ず `YYYY-MM-DD` |
| `400` | `{"code":"22P02","message":"invalid input syntax for type time: \"12:41 PM\""}` | 時刻形式が不正 | `time` は `HH:MM:SS`（24 時間制、コロン区切り） |
| `400` | `{"code":"22007","message":"invalid input syntax for type timestamp with time zone"}` | `sleep_start` / `sleep_end` の形式不正 | `2026-08-19T07:10:00+09:00` の形。§5 のスクリプトを使う |
| `400` | `{"code":"22003","message":"numeric field overflow","details":"A field with precision 5, scale 2 must round to an absolute value less than 10^3."}` | `weight_kg` が `numeric(5,2)` の桁を超えた（整数部 3 桁まで＝1000 以上）。300〜999 なら先に `23514` になる | 単位を確認。g で送っていないか |
| `400` | `{"code":"23502","message":"null value in column \"meal_type\" ... violates not-null constraint"}` | 必須列が欠落 | `meals` は `date` と `meal_type` が必須、`workouts` は `date` が必須 |
| `413` | `{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}` | 画像が 10MB 超 | `sips -Z 2000` で縮小、または `-s formatOptions 60` で再圧縮してから再送 |
| `400` / `415` | `{"statusCode":"415","error":"invalid_mime_type","message":"mime type image/heic is not supported"}` | 許可外の MIME（HEIC / GIF / PDF 等）、または `Content-Type` ヘッダと実体の不一致 | `sips -s format jpeg` で JPEG に変換し、`Content-Type: image/jpeg` を送る |
| `409` | `{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}` | 同じ Storage パスに 2 回アップロード | uuid を新しく生成し直す（上書きしたいときだけ `x-upsert: true`） |
| `2xx` だが Web に出ない | — | 下記「登録は成功したのに表示されない」参照 | |

### CHECK 制約名 → 原因

| 制約名 | 違反条件 | 正しい範囲 |
|---|---|---|
| `daily_logs_weight_kg_check` | `weight_kg <= 0` または `>= 300` | 0 < w < 300 |
| `daily_logs_sleep_score_check` | 0〜100 の外 | 0〜100（**0 可**） |
| `daily_logs_meditation_min_check` | 負の数 | 0 以上 |
| `daily_logs_condition_score_check` | 1〜10 の外（**0 は違反**） | 1〜10 |
| `daily_logs_mood_check` | 1〜10 の外（**0 は違反**） | 1〜10 |
| `daily_logs_steps_check` | 負の数 | 0 以上 |
| `daily_logs_active_kcal_check` | 負の数 | 0 以上 |
| `daily_logs_exercise_min_check` | 負の数 | 0 以上 |
| `daily_logs_stand_hours_check` | 0〜24 の外 | 0〜24 |
| `sleep_range` | `sleep_end <= sleep_start`、または差が 24 時間以上 | §5 のスクリプトが検証済み。手で組み立てたときに出る |
| `meals_meal_type_check` | `breakfast`/`lunch`/`dinner`/`snack` 以外。**日本語や大文字は違反** | 英小文字の 4 語のみ |
| `meals_source_check` / `workouts_source_check` | `entity`/`web` 以外 | Entity は必ず `entity` |

### 「登録は成功したのに Web アプリに何も出ない」

これはエラーが出ないので一番厄介。上から順に確認する。

1. **`date` が今日ではない。** `date +%F` を `TZ=Asia/Tokyo` なしで実行していないか。JST 09:00 より前は UTC 日付が 1 日前になるので、深夜〜早朝の記録がずれる。**必ず `TZ=Asia/Tokyo date +%F`。**
2. **`sleep_start` / `sleep_end` にオフセットが無い。** 保存はされているが 9 時間ずれている。§5 のとおり `+09:00` を付ける。
3. **Web アプリで別の日付を見ている。** `/log/2026-08-19` を直接開いて確認する。
4. **写真だけ出ない → `photo_url` が URL になっている、または `photos/` プレフィックス付き。** DB の値を確認する。

```bash
curl -sS "$SUPABASE_URL/rest/v1/meals?date=eq.2026-08-19&select=id,photo_url" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
# photo_url は "meals/2026/08/....jpg" で始まること。
# "https://" や "photos/" で始まっていたら PATCH で直す。
```

5. **Web アプリがキャッシュを持っている。** ページをリロードするか、アプリを一度閉じて開き直す（React Query が再取得する）。
6. **ENTITY バッジが出ない → `source` が `web` になっている。** `source` の送り忘れ。PATCH で `{"source":"entity"}` に直す。

---

## 10. チェックリスト

**送信ボタンを押す前に毎回、これを頭から通す。**

### 全リクエスト共通

- [ ] `set -a; source ~/.entity-dock.env; set +a` を実行済み
- [ ] `apikey` と `Authorization: Bearer` の**両方**のヘッダがある
- [ ] URL に `/rest/v1/` または `/storage/v1/` が入っている
- [ ] キーやヘッダの中身をログ・LINE に出していない

### 日付

- [ ] `date` は `TZ=Asia/Tokyo date +%F` の結果（= JST の今日）。れおんが過去日を指定したときだけ手で変える
- [ ] 「昨日の夜」「一昨日」のような相対表現を、JST 基準で正しく解決した
- [ ] 睡眠の `date` は**起床日**（就寝日ではない）
- [ ] 写真パスの `YYYY/MM` は記録の `date` の年月（アップロード日ではない）

### `daily_logs` の UPSERT

- [ ] `POST /rest/v1/daily_logs?on_conflict=date`
- [ ] `Prefer: resolution=merge-duplicates` がある
- [ ] payload は `date` **＋ 今回報告された項目だけ**。他のカラム名は 1 つも書いていない
- [ ] `null` を送っているなら、それは「消せ」という明示的な意図がある場合だけ
- [ ] `updated_at` を送っていない
- [ ] 数値が CHECK の範囲内: 体重 0〜300 / `condition_score`・`mood` は **1〜10** / `sleep_score` 0〜100 / `stand_hours` 0〜24 / その他 0 以上
- [ ] `sleep_start` / `sleep_end` に `+09:00` が付いている。かつ `sleep_end > sleep_start`

### `meals` / `workouts`

- [ ] `"source": "entity"` が入っている
- [ ] `photo_url` は**パス**（`meals/2026/08/<uuid>.jpg`）。`https://` でも `photos/` 始まりでもない
- [ ] `meal_type` は `breakfast` / `lunch` / `dinner` / `snack` のいずれか（英小文字）
- [ ] `time` は `HH:MM:SS`
- [ ] `tags` は既存語彙から選んだ。新語を発明していない（§6・§7 の表）
- [ ] `id` / `created_at` を送っていない
- [ ] 同じ内容を二重登録していない（送信前にその日の既存行を確認）

### Storage

- [ ] JPEG に変換済み（`sips -s format jpeg`）で `Content-Type: image/jpeg`
- [ ] 10MB 未満
- [ ] uuid は新規生成（使い回していない）

### 送信後

- [ ] レスポンスの HTTP ステータスとレスポンス body を確認した
- [ ] `return=representation` の結果で、**消えてはいけない列が残っている**ことを確認した
- [ ] 判断に迷った箇所（読めない字、不確かな数字、新しいタグ）はれおんに確認した

---

## 付録: テーブル定義（`supabase/migrations/20260819000000_init.sql` より）

```sql
create table public.daily_logs (
  date            date primary key,
  weight_kg       numeric(5, 2) check (weight_kg > 0 and weight_kg < 300),
  sleep_start     timestamptz,
  sleep_end       timestamptz,
  sleep_score     smallint check (sleep_score between 0 and 100),
  meditation_min  smallint check (meditation_min >= 0),
  condition_score smallint check (condition_score between 1 and 10),
  mood            smallint check (mood between 1 and 10),
  steps           integer check (steps >= 0),
  active_kcal     integer check (active_kcal >= 0),
  exercise_min    smallint check (exercise_min >= 0),
  stand_hours     smallint check (stand_hours between 0 and 24),
  diary           text,
  updated_at      timestamptz not null default now(),
  constraint sleep_range check (
    sleep_start is null
    or sleep_end is null
    or (sleep_end > sleep_start and sleep_end - sleep_start < interval '24 hours')
  )
);

create table public.meals (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  time        time,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url   text, -- 'photos' バケット内のオブジェクトパス。URL ではない
  description text,
  tags        text[] not null default '{}',
  source      text not null default 'web' check (source in ('entity', 'web')),
  created_at  timestamptz not null default now()
);

create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  photo_url  text,
  menu       text,
  notes      text,
  tags       text[] not null default '{}',
  source     text not null default 'web' check (source in ('entity', 'web')),
  created_at timestamptz not null default now()
);
```

`user_id` は存在しない。認証もない。スキーマを変更したときは**このファイルも更新する**こと。
