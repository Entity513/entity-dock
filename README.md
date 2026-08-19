# Entity Dock

**あなたの夢を、目的地へ。**

食事・トレーニング・睡眠・瞑想・体重・活動量・日記を一元管理する個人用コンディション管理アプリ。LINE 経由で Entity（Mac mini 上のエージェント）が記録を届ける母港（ドック）。

- **フロント**: Vite + React + TypeScript + Tailwind（このリポジトリ）
- **データ**: Supabase（Postgres + Storage）
- **デプロイ**: Netlify（private リポジトリ）
- **書き込み経路**: ① この Web アプリ ② LINE → Entity → Supabase REST API（Phase 2）

> 旧 Re:Poker の説明ページは `docs/repoker/` に退避してあります。

## ⚠️ 認証なし構成について

このアプリは**ログインを持ちません**（オーナーの判断による設計）。そのため:

- **公開 URL を知っている人は誰でも全データを閲覧・編集・削除できます。**
- anon キーは JS バンドルに含まれるため、鍵で守ることはできません。
- URL を他人に共有しない、SNS 等に貼らない、という運用が唯一の防御です。

あとからログインを付ける場合は、各テーブルに `user_id uuid default auth.uid()` を戻し、RLS ポリシーを `user_id = auth.uid()` に変更したうえで、フロントに Supabase Auth のログイン画面を追加します。

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成（リージョンは Tokyo 推奨）。
2. **Settings → API** で以下を控える:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` キー → `SUPABASE_ANON_KEY`
   - `service_role` キー → Entity 用（**Mac mini の環境変数のみに置く。このリポジトリには絶対に入れない**）

### 2. スキーマ適用

**SQL Editor** に `supabase/migrations/20260819000000_init.sql` の内容を貼り付けて実行する。

- テーブル 3 つ（daily_logs / meals / workouts）+ RLS（anon 全許可）+ バケット `photos` が作成される。
- **このファイルは先頭で既存オブジェクトを drop するので、何度でも流し直せます**（既存データは消えます）。
- 末尾の Storage 節が権限エラーになった場合は、その節だけを SQL Editor で再実行する。

### 3. ローカル開発

```bash
cp .env.example .env   # 値を記入
npm install
npm run dev
```

### 4. Netlify デプロイ

1. Netlify で **Import from Git** → この private リポジトリを選択。ビルド設定は `netlify.toml` が持っているのでそのまま。
2. **Branch to deploy** をこのブランチに設定。
3. **Site configuration → Environment variables** に 2 つ設定:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. デプロイ。**環境変数はビルド時に焼き込まれる**ので、値を変えたら再デプロイが必要。
5. iPhone の Safari でサイトを開き、**共有 → ホーム画面に追加**。

サイト名（URL）は推測されにくいものにしておくと、多少はマシです（Netlify の Site configuration → Change site name）。

## Phase 2 に向けたメモ（Entity 連携）

詳細な curl 例は Phase 2 で `ENTITY_API.md` として作成する。先に押さえておくこと:

- Entity は `service_role` キーで REST API を叩く（RLS はバイパスされる）。
- `daily_logs` は `date` を conflict キーに UPSERT（同日 2 回目の体重報告は上書き）。
- 写真は Storage `photos` バケットにアップロードし、`photo_url` には**オブジェクトパス**（例 `meals/2026/08/xxx.jpg`）を入れる。署名 URL は入れない。

## 画面構成

下部ナビは5タブ。中央の BRIDGE が母艦で、両脇に4系統の計器が並ぶ。
各タブは **上に今日の入力、下にその系統の分析**という構成。

| タブ | パス | 内容 |
|---|---|---|
| DRIVE 運動量 | `/drive` | 今日の活動量 + 筋トレ / 歩数・カロリー・エクササイズ推移、歩数×コンディション、部位別日数 |
| FUEL 食事 | `/fuel` | 今日の食事タイムライン / タグ別の平均コンディション、体重推移 |
| BRIDGE まとめ | `/` | 今日の記録状況・全数値・月カレンダー / サマリー、体重・コンディション推移 |
| MIND マインド | `/mind` | 体調・気分・瞑想・日記 / コンディション・気分・瞑想推移、瞑想×コンディション |
| REST 睡眠 | `/rest` | 昨夜の睡眠 / 睡眠時間・スコア推移、睡眠×コンディション |

| 画面 | パス | 内容 |
|---|---|---|
| 日別詳細 | `/log/:date` | BRIDGE のカレンダーから開く。食事写真タイムライン + 筋トレ + 日記 + 数値、全て編集可 |

分析の期間は 30 / 90 / 180 日で切り替え。移動平均は7日。
設定画面（目標体重・目標睡眠時間）は未実装。
