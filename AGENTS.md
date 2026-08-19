# AGENTS.md — このコードを編集するエージェントへ

Entity Dock のコードを変更する前に読むこと。ENTITY_API.md は「データを書き込む側」の手順書で、こちらは「コードを編集する側」の約束事。

このコードベースには、破っても**エラーが出ないまま静かにデータが壊れる**箇所がいくつかある。すべて実際に踏んだ不具合を潰した結果なので、理由が分からないまま直さないこと。

---

## 1. 絶対に破ってはいけない不変条件

### 1.1 日付は必ず `src/lib/date.ts` を経由する

```ts
// ❌ 禁止 — UTC 深夜として解釈され、JST では日付が1日ずれる
new Date('2026-08-19')
someDate.toISOString().slice(0, 10)

// ✅ 正しい
import { todayStr, toDateStr, parseDateStr, addDays } from '../lib/date'
```

`toISOString()` を使ってよいのは **睡眠の timestamptz を送るときだけ**（`combineSleepTimes` の中）。日付文字列を作る用途では使わない。

変更後に必ず確認:

```bash
grep -rn "new Date('.*-.*-\|toISOString().slice" src/ | grep -v lib/date.ts
```

何も出なければ OK。

### 1.2 `daily_logs` の保存は部分 UPSERT

各エディタは **自分が編集したカラムだけ**を送る。

```ts
// ✅ 体重シートはこれだけ送る
upsert.mutate({ weight_kg: weight })

// ❌ 禁止 — 他のシートが入れた値を null で上書きする
upsert.mutate({ ...cachedLog, weight_kg: weight })
```

`useUpsertDailyLog` が `date` を足して `onConflict: 'date'` で送る。PostgREST はペイロードに含まれる列だけ更新するので、朝に入れた体重が夜の体調入力で消えることがない。**キャッシュ済みの行を丸ごとスプレッドして送るのは禁止。**

### 1.3 エラー判定は `isLoadingError`、`isError` ではない

```ts
// ❌ 禁止 — バックグラウンド再取得が1回失敗しただけで
//    表示中の内容と編集中のシートが吹き飛ぶ
if (query.isError) return <ErrorPanel />

// ✅ 正しい — 初回読込の失敗だけを致命扱いにする
if (query.isLoadingError) return <ErrorPanel />
```

react-query v5 では、キャッシュがある状態で再取得が失敗しても `isError` が true になる。iPhone をスリープから復帰させたときに `refetchOnWindowFocus` が走るので、これは日常的に起きる。

### 1.4 編集シートは query の状態に関係なく描画し続ける

`useDaySheets` が返す `sheets` は、**ローディング分岐・エラー分岐のどちらでも描画する**こと。

```tsx
if (isLoading) {
  return (
    <>
      <Skeleton />
      {sheets}   {/* ← これを落とすと入力中の内容が消える */}
    </>
  )
}
```

写真を選ぶとカメラアプリに移動して戻ってくるため、シートを開いたまま再取得が走るのは普通に起きる。

### 1.5 シートの保存先の日付は開いた時点で固定する

`useDaySheets(date, log)` は `openDaily()` などが呼ばれた時点の `date` を `SheetState` に持つ。深夜0時をまたいで表示中の日付が切り替わっても、保存先は開いた日のまま。**シートに live な `date` を渡し直さないこと。**

### 1.6 `photo_url` は Storage のオブジェクトパス

URL でも署名 URL でもない。`meals/2026/08/<uuid>.jpg` の形。表示のたびに `useSignedUrl` が署名 URL を作る（TTL 1時間）。DB に URL を保存すると期限切れで表示できなくなる。

### 1.7 認証はない

このアプリはログインを持たない。`user_id` カラムは存在しない。RLS は anon に全許可。**認証を前提にしたコード（`auth.uid()`、セッション、`user_id` の送信）を書かない。**

---

## 2. デザインの約束事

ダーク固定のコックピット/管制室系。**ありきたりな SaaS 風にしない**のが唯一かつ最重要のルール。

| 項目 | 決まり |
|---|---|
| 角丸 | 最大 4px。`rounded-xl` `rounded-2xl` は使わない |
| 影 | 使わない。境界は 1px の `border-line` で表現する |
| 数値 | `.num` クラス（IBM Plex Mono + tabular-nums）を必ず付ける |
| ラベル | `.microlabel`（英大文字 + トラッキング広め）+ 日本語サブラベル |
| 色 | `src/styles/index.css` の `@theme` トークンのみ。生の hex をコンポーネントに書かない |
| ライトテーマ | 無い。`dark:` プレフィックスを書かない |
| 幅 | iPhone 390px 前提。`max-w-lg` シェル内に収める |

### Tailwind v4 である

important 修飾子は**接尾辞**。`!px-3` ではなく `px-3!`。`tailwind.config.js` は存在しない（テーマは CSS の `@theme`）。

### 色トークン

```
bg #0a0e12 / panel #10161d / panel2 #161e27 / line #1f2a35
ink #d6e2ec / ink-dim #6b7d8f
accent #3ef58f（記録済み・OK） / warn #ffb454（未入力） / alert #ff5d6c / data #4cc3ff（散布図）
```

### アニメーション

`.reveal`（段階的な立ち上がり）、`.page-enter`、`.scanline` を使う。新しく足す場合も **`prefers-reduced-motion` で必ず無効化する**（`src/styles/index.css` の末尾にメディアクエリがある）。

---

## 3. 画面の構造

下部ナビは5タブ。各タブは **上に今日の入力、下にその系統の分析**。

| タブ | パス | ページ |
|---|---|---|
| DRIVE 運動量 | `/drive` | `src/pages/DrivePage.tsx` |
| FUEL 食事 | `/fuel` | `src/pages/FuelPage.tsx` |
| BRIDGE まとめ | `/` | `src/pages/BridgePage.tsx` |
| MIND マインド | `/mind` | `src/pages/MindPage.tsx` |
| REST 睡眠 | `/rest` | `src/pages/RestPage.tsx` |
| 日別詳細 | `/log/:date` | `src/pages/DayDetailPage.tsx` |

再利用する部品:

- `useDaySheets(date, log)` — 編集シート一式。`openDaily` / `openMeal` / `openWorkout` / `sheets`
- `AnalysisBlock` — 期間セレクタ + 読込・エラー処理。children は `(data) => ReactNode`
- `TodayCard` — 「今日の値 + 記録する」カード
- `TrendPanel` / `ScatterPanel` / `TagConditionPanel` / `SummaryPanel` — グラフ各種
- `Reveal` — 段階的な立ち上がり。`index` に上からの並び順を渡す
- `PageHeader` — 各タブの見出し

**新しいグラフを足すときは `useRangeData` に系列を追加してから `TrendPanel` に渡す。** ページの中で生の集計を書かない。

---

## 4. 変更したら必ず通すこと

```bash
npm run build        # tsc --noEmit + vite build。両方通ること
```

型エラーやビルドエラーが出たまま push しない。

### 見た目を変えたときはスクリーンショットで確認する

**目で見ずにデザインを変更しない。** 手順:

```bash
# 1. 開発サーバを起動（バックグラウンド）
npm run dev -- --host 127.0.0.1 --port 5175

# 2. Playwright で5タブを撮る
node scripts/shoot.mjs        # 無ければ下の要領で書く
```

スクリプトの要点:

- Chromium: Mac なら `npx playwright install chromium` で入る
- ビューポート `390x844`、`deviceScaleFactor: 2`、`isMobile: true`
- Supabase の REST を `context.route('**/rest/v1/daily_logs*', ...)` でスタブし、60日ぶんくらいのモックを返す
- 5タブ（`/`, `/drive`, `/fuel`, `/mind`, `/rest`）を `fullPage` で撮る
- 横スクロールの検出: `document.documentElement.scrollWidth === clientWidth` であること
- `pageerror` / `console.error` を拾って0件であること

**撮った画像を実際に開いて見ること。** はみ出し、切れた軸ラベル、潰れた文字、高さ0のパネルを探す。直るまで繰り返す。

---

## 5. 反映の手順

```bash
git checkout -b <作業ブランチ名>
# 編集
npm run build
git commit -m "何をなぜ変えたか"
git push -u origin <作業ブランチ名>
```

**`main` や `claude/*` ブランチに直接 push しない。** 作業ブランチに push して、れおんが確認してからマージする。

コミットメッセージは日本語で、**何を変えたかではなく、なぜ変えたか**を書く。

---

## 6. 迷ったら止まる

以下に該当する変更は、勝手に進めずれおんに確認する。

- スキーマの変更（`supabase/migrations/`）— 既存データが消える可能性がある
- `src/lib/date.ts` / `src/hooks/useDailyLog.ts` の変更 — §1 の不変条件の本体
- 認証を足す / RLS を変える
- 依存パッケージの追加
- タブ構成そのものの変更

小さく直せない、または理由が分からない箇所に触りそうになったら、**変更せずに状況を報告する**。動くものを壊すより、何もしないほうがいい。
