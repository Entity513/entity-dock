# Entity Dock

**あなたの夢を、目的地へ。**

食事・トレーニング・睡眠・瞑想・体重・活動量・日記を一元管理する個人用コンディション管理アプリ。LINE 経由で Entity（Mac mini 上のエージェント）が記録を届ける母港（ドック）。

- **フロント**: Vite + React + TypeScript + Tailwind（このリポジトリ）
- **データ**: Supabase（Postgres + Auth + Storage + RLS）
- **デプロイ**: Netlify（private リポジトリ）
- **書き込み経路**: ① この Web アプリ ② LINE → Entity → Supabase REST API（Phase 2）

> 旧 Re:Poker の説明ページは `docs/repoker/` に退避してあります。

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成（リージョンは Tokyo 推奨）。
2. **Settings → API** で以下を控える:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` キー → `SUPABASE_ANON_KEY`
   - `service_role` キー → Entity 用（**Mac mini の環境変数のみに置く。このリポジトリには絶対に入れない**）

### 2. スキーマ適用

**SQL Editor** に `supabase/migrations/20260819000000_init.sql` の内容を貼り付けて実行する。

- テーブル 3 つ（daily_logs / meals / workouts）+ RLS + private バケット `photos` が作成される。
- 末尾の Storage 節がもし権限エラーになった場合は、その節だけを SQL Editor で再実行する（ファイル内のコメント参照）。
- **Storage → photos** バケットが Private になっていることを確認。

### 3. 認証設定（重要）

1. **Authentication → Users → Add user** で自分のメールアドレスのユーザーを 1 人作成（**Auto Confirm User を ON**）。パスワードは使わないので適当な強いランダム値でよい。
2. **Authentication → Sign In / Providers** で **「Allow new users to sign up」を OFF** にする。
   anon キーは公開される鍵なので、これを切らないと誰でもアカウントを作れてしまう（RLS でデータは見えないが、切っておくのが前提）。
3. **Authentication → Emails（メールテンプレート） → Magic Link** のテンプレートに 6 桁コードを追加する:

   ```html
   <h2>Entity Dock ログイン</h2>
   <p>コード: {{ .Token }}</p>
   <p>またはリンクを開く: <a href="{{ .ConfirmationURL }}">ログイン</a></p>
   ```

   ※ iPhone のホーム画面アプリではメールのリンクを開くと Safari 側でログインされてしまうため、**アプリ内で 6 桁コードを入力するのが主経路**。
4. **Authentication → URL Configuration** で **Site URL** を Netlify の URL（例 `https://entity-dock.netlify.app`）に設定。ローカル開発も使うなら **Redirect URLs** に `http://localhost:5173` を追加。

### 4. ローカル開発

```bash
cp .env.example .env   # 値を記入
npm install
npm run dev
```

### 5. Netlify デプロイ

1. Netlify で **Import from Git** → この private リポジトリを選択。ビルド設定は `netlify.toml` が持っているのでそのまま。
2. **Site configuration → Environment variables** に 2 つ設定:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. デプロイ。**環境変数はビルド時に焼き込まれる**ので、値を変えたら再デプロイが必要。
4. iPhone の Safari でサイトを開き、**共有 → ホーム画面に追加**。ホーム画面版は Safari とストレージが分かれているため、そこで一度ログインする（メールの 6 桁コードを入力）。

## セキュリティ前提

- 全テーブル RLS 有効。ポリシーは `user_id = auth.uid()` の本人のみ。anon 向けポリシーなし。
- 写真は private バケット + 署名 URL（1 時間）。DB にはオブジェクトパスのみ保存。
- `service_role` キーはこのリポジトリ・Netlify に置かない。
- リポジトリは private を維持する（個人の健康データを扱うため）。

## Phase 2 に向けたメモ（Entity 連携）

詳細な curl 例は Phase 2 で `ENTITY_API.md` として作成する。先に押さえておくこと:

- Entity は `service_role` キーで REST API を叩く。RLS はバイパスされるが、各テーブルの `user_id` は **NOT NULL かつ default が効かない**ため、**明示的に `user_id` を送る必要がある**（意図した安全装置）。
- 自分の UUID は **Dashboard → Authentication → Users** の該当ユーザーの ID。
- `daily_logs` は `date` を conflict キーに UPSERT（同日 2 回目の体重報告は上書き）。
- 写真は Storage `photos` バケットにアップロードし、`photo_url` には**オブジェクトパス**（例 `meals/2026/08/xxx.jpg`）を入れる。署名 URL は入れない。

## 画面構成

| 画面 | パス | 内容 |
|---|---|---|
| Today | `/` | 今日の記録状況（未入力が一目でわかる）+ クイック入力 |
| Log | `/log` | 月カレンダー（食事・筋トレ・日記のドット + 体調の色付け） |
| 日別詳細 | `/log/:date` | 食事写真タイムライン + 筋トレ + 日記 + 数値。全て編集可 |

Dashboard（推移グラフ・散布図・タグ別分析）と設定画面は Phase 2。
