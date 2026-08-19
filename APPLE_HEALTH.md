# Apple Health 自動連携 (Phase 3)

Apple Watch / iPhone のヘルスケアデータを、毎晩自動で `daily_logs` に書き込む手順。

対象データ:

| ヘルスケア | daily_logs の列 | 取得元 |
|---|---|---|
| 歩数 | `steps` | iPhone / Apple Watch |
| アクティブエネルギー | `active_kcal` | Apple Watch |
| エクササイズ時間 | `exercise_min` | Apple Watch |
| スタンド時間 | `stand_hours` | Apple Watch |
| 睡眠（就寝・起床） | `sleep_start` / `sleep_end` | Apple Watch |
| 体重 | `weight_kg` | スマート体重計（ヘルスケア連携がある場合） |

方式は2つ。**睡眠まで自動化したいなら B（受け口は実装済み）**。歩数などの活動量だけを今すぐ無料で試したいなら A。

| | A. ショートカット | B. Health Auto Export |
|---|---|---|
| 費用 | 無料 | アプリが有料 |
| 睡眠 | 扱いづらい（非対応とする） | ✅ 対応 |
| 活動量 | ✅ 対応 | ✅ 対応 |
| 準備 | ショートカットを手で組む | Edge Function をデプロイ + アプリ設定 |
| 実装 | 手順のみ | `supabase/functions/health-import/` に実装済み |

## 前提: Mac mini は経由しない

A / B のどちらも **iPhone から直接 Supabase に HTTPS で送る**構成で、Entity が動いている Mac mini は関与しない。

```
iPhone（オーナーのプライベート Apple アカウント）
  ├─ ショートカット / Health Auto Export ──→ Supabase   ← Mac mini を通らない
  └─ LINE で写真・数値を送る ──→ Entity (Mac mini) ──→ Supabase
```

Mac mini は別の Apple アカウントで運用されているが、ヘルスケア連携には無関係。iCloud 同期でヘルスケアを Mac mini に渡す必要はない（渡せない）。

---

## A. iOS ショートカット（無料・当日中に動く）

活動量4項目（歩数・アクティブカロリー・エクササイズ・スタンド）を毎晩 Supabase に送る。ショートカットの「ヘルスケアのサンプルを取得」は集計値を素直に取れるので、活動量とは相性が良い。睡眠は扱いが煩雑なので B に任せる。

### 準備するもの

- Supabase の **anon キー**（Netlify の環境変数と同じもの。ショートカットは端末内に閉じているが、anon キーは公開前提の鍵なので問題ない）
- プロジェクト URL: `https://qnxtxnrzsbzjxejtmvtr.supabase.co`

### ショートカットの構成

「ショートカット」アプリ → 新規ショートカット → 以下を順に追加する。

**1. 日付を作る**

| アクション | 設定 |
|---|---|
| 日付 | 現在の日付 |
| 日付をフォーマット | カスタム、フォーマット文字列 `yyyy-MM-dd` |
| 変数に追加 | 名前 `TODAY` |

⚠️ この日付は端末のタイムゾーン（JST）で作られる。UTC に変換してはいけない。

**2. 各指標を取り出す**

指標ごとに次の3アクションを繰り返す。

| アクション | 設定 |
|---|---|
| ヘルスケアのサンプルを取得 | タイプ = 歩数 / 期間 = 今日 / すべてのサンプル |
| 数値を計算 or 統計値 | 合計 |
| 変数に追加 | 名前 `STEPS` |

同じ要領で:

| 指標 | ヘルスケアのタイプ | 集計 | 変数名 |
|---|---|---|---|
| 歩数 | 歩数 | 合計 | `STEPS` |
| アクティブカロリー | アクティブエネルギー | 合計（kcal） | `KCAL` |
| エクササイズ | エクササイズ時間 | 合計（分） | `EXERCISE` |
| スタンド | スタンド時間 | 合計（時間） | `STAND` |

⚠️ 単位に注意。エクササイズは「分」、スタンドは「時間」で送る。ショートカット側が秒や別単位で返す場合は「数値を計算」で割ってから変数に入れる。スタンドが 24 を超えると DB の CHECK 制約で弾かれる。

**3. 辞書を作る**

「辞書」アクションで次のキーを作る。値には上で作った変数を挿し込む。

| キー | 値 |
|---|---|
| date | `TODAY` |
| steps | `STEPS` |
| active_kcal | `KCAL` |
| exercise_min | `EXERCISE` |
| stand_hours | `STAND` |

⚠️ **ここに含めたキーだけが更新される。** `weight_kg` や `diary` を入れてはいけない。入れると、その日に手入力した値や Entity が書いた値を空で上書きしてしまう。

**4. Supabase に送る**

「URLの内容を取得」アクションを追加し、次のとおり設定する。

- URL: `https://qnxtxnrzsbzjxejtmvtr.supabase.co/rest/v1/daily_logs?on_conflict=date`
- 方法: **POST**
- ヘッダ:

  | キー | 値 |
  |---|---|
  | `apikey` | anon キー |
  | `Authorization` | `Bearer ` + anon キー |
  | `Content-Type` | `application/json` |
  | `Prefer` | `resolution=merge-duplicates` |

- 本文を要求: **JSON** → 3で作った辞書を指定

`Prefer: resolution=merge-duplicates` と `on_conflict=date` の組み合わせが肝で、これにより**同じ日付の行があれば、送ったキーだけが上書きされる**。毎晩実行しても、朝に手入力した体重は消えない。

**5. 動作確認**

ショートカットを手動で1回実行し、[Web アプリ](https://entity-dock-726eca88ebac.netlify.app)の Today 画面で「活動量」チップが緑になれば成功。

### 自動実行の設定

ショートカットアプリ → **オートメーション** タブ → 新規 → **時刻** を選択

- 時刻: `23:30`（就寝前。日付が変わる前に当日分を確定させる）
- 繰り返し: 毎日
- 実行するショートカット: 上で作ったもの
- **「実行前に尋ねる」を OFF**（これを切らないと通知タップが必要になる）

⚠️ 深夜0時をまたぐと `TODAY` が翌日になり、前日のデータが翌日の行に入る。23:30 など、日付が変わる前の時刻にすること。

---

## B. Health Auto Export（有料・睡眠まで自動化）★推奨

睡眠を自動で入れたいならこちら。受け口の Edge Function は**実装済み**なので、デプロイとアプリ設定だけで動く。

### 構成

```
Apple Watch → iPhone ヘルスケア → Health Auto Export
   → (定期POST) → Edge Function (health-import) → daily_logs に UPSERT
```

コード: `supabase/functions/health-import/index.ts`

やっていること:

- 共有シークレット（`x-api-key` ヘッダ）で認証
- 歩数・アクティブカロリー・エクササイズ・スタンド・体重・睡眠を抽出
- 日付は HAE が送るローカル日付（JST）をそのまま使う
- 睡眠は行の `date` を**起床日**にする（就寝が前日でも正しい行に入る）
- 同じ日に複数点が来たら合算（体重だけ最後の値）
- カロリーが kJ で来たら kcal に換算
- DB の CHECK 制約に触れる睡眠（逆転・24時間超）は送る前に捨てる
- **受け取った指標に対応する列だけ**を UPSERT（手入力や Entity の値を消さない）
- 知らない指標はレスポンスの `ignored` に出す（何が来ているか分かる）

### 1. デプロイ

Mac mini で:

```bash
# 任意の長いランダム文字列を作る
openssl rand -hex 32

# シークレットを登録
supabase secrets set HEALTH_IMPORT_SECRET=<いま作った文字列> \
  --project-ref qnxtxnrzsbzjxejtmvtr

# デプロイ（--no-verify-jwt が必須。HAE は Supabase の JWT を送れない）
supabase functions deploy health-import --no-verify-jwt \
  --project-ref qnxtxnrzsbzjxejtmvtr
```

関数の URL:

```
https://qnxtxnrzsbzjxejtmvtr.supabase.co/functions/v1/health-import
```

### 2. 動作確認（アプリを入れる前に）

```bash
curl -sS -X POST \
  "https://qnxtxnrzsbzjxejtmvtr.supabase.co/functions/v1/health-import" \
  -H "x-api-key: <シークレット>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"metrics":[
    {"name":"step_count","units":"count","data":[{"date":"2026-08-19 08:00:00 +0900","qty":9421}]},
    {"name":"sleep_analysis","data":[{"date":"2026-08-19 00:00:00 +0900","sleepStart":"2026-08-18 23:40:00 +0900","sleepEnd":"2026-08-19 07:10:00 +0900"}]}
  ]}}'
```

`{"ok":true,"days":1,"dates":["2026-08-19"],...}` が返り、Web アプリの
まとめ画面で歩数と睡眠が入っていれば成功。

### 3. iPhone アプリの設定

1. App Store で「Health Auto Export - JSON+CSV」を入れる
2. **Automations → 新規 → REST API**
3. URL: 上の関数 URL
4. Method: **POST**、Format: **JSON**
5. ヘッダに `x-api-key` = シークレットを追加
6. 送るデータ: `Step Count`, `Active Energy`, `Apple Exercise Time`,
   `Apple Stand Hour`, `Sleep Analysis`（体重計があれば `Body Mass`）
7. 実行間隔: 1日1回、**朝（睡眠データが確定した後）**

⚠️ 指標名がここに書いたものと違っても、関数側で表記ゆれを吸収している。
それでも入らない場合は、レスポンスの `ignored` に実際の名前が出るので、
`METRIC_ALIASES` にその名前を足す。

### 4. 確認

送信後、Web アプリの **REST（睡眠）** タブと **DRIVE（運動量）** タブに
値が出ていれば完了。以降は放置で毎日入る。

## 睡眠スコアについて

`sleep_score` は Apple 純正のヘルスケアから確実に取れるとは限らない。Apple Watch の睡眠スコアが HealthKit 経由で書き出せるかは OS のバージョン次第で、サードパーティ製アプリ（AutoSleep など）が独自に書き込んでいる場合もある。

まず Health Auto Export の書き出し可能な項目一覧を確認して、なければ:

- 手入力で運用する（睡眠シートに入力欄がある）
- または Apple Watch のスクリーンショットを LINE で Entity に送って読ませる

のどちらかにする。就寝・起床時刻さえ自動で入れば、睡眠時間の傾向は追える。

---

## 共通の注意

| 項目 | 内容 |
|---|---|
| 日付 | 必ず JST。`toISOString()` 相当の UTC 変換をすると朝夕に1日ずれる |
| 部分更新 | 送るキーは自動取得できる項目だけ。手入力の列を含めない |
| 冪等性 | `on_conflict=date` + `merge-duplicates` なので、同じ日に何度送っても安全 |
| 制約 | `stand_hours` 0-24、`steps`/`active_kcal`/`exercise_min` は 0 以上。範囲外は 400 (23514) で弾かれる |
| 確認 | 送信後は Web アプリの Today / Log 画面で見える。見えない場合はまず日付を疑う |
