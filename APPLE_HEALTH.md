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

方式は2つ。**まず A のショートカットで試して、睡眠まで自動化したくなったら B に乗り換える**のが早い。

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

## B. Health Auto Export（有料・睡眠まで自動化）

App Store の「Health Auto Export - JSON+CSV」を使う。REST API へ定期送信する機能があり、睡眠を含む広範なデータをまとめて吐ける。

### 構成

```
Apple Watch → iPhone ヘルスケア → Health Auto Export
   → (定期POST) → Supabase Edge Function → daily_logs に UPSERT
```

Health Auto Export が送る JSON は日付・単位・入れ子の形が独自なので、**間に Edge Function を1つ挟んで整形する**のが確実。REST API に直接投げても、そのままではスキーマに合わない。

### 手順

1. アプリ内で **Automations → REST API** を選び、送信先 URL に後述の Edge Function の URL を設定
2. 送信するデータ: `Step Count`, `Active Energy`, `Apple Exercise Time`, `Apple Stand Hour`, `Sleep Analysis`, （体重計があれば `Body Mass`）
3. 送信間隔: 1日1回（深夜〜早朝。睡眠データが確定した後）
4. フォーマット: JSON

### Edge Function（受け口）

`supabase/functions/health-import/index.ts` を作り、次の処理を書く。

- 共有シークレット（ヘッダ）で簡易認証する ⚠️ この関数は公開 URL になるので、無防備だと誰でも書き込める
- 受け取った JSON から指標ごとに日付・値を取り出す
- 日付は **JST** で解釈する（UTC で切ると1日ずれる）
- 睡眠は「就寝の開始時刻」と「起床の終了時刻」を取り、行の `date` は**起床日**にする
- `daily_logs` に `on_conflict=date` + `merge-duplicates` で UPSERT（service_role キーを使う。Edge Function の環境変数に入れる）
- **送られてきた指標に対応する列だけ**を payload に入れる

デプロイ:

```bash
supabase functions deploy health-import --project-ref qnxtxnrzsbzjxejtmvtr
```

実装は実際に届く JSON の形を見てからのほうが速いので、**まず1回 Health Auto Export から送らせて、そのペイロードを保存してから書く**。

---

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
