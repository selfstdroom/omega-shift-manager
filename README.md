# Omega Shift Manager

オメガテクノ向けシフト管理Webアプリです。Next.js App Router、TypeScript、Tailwind CSS、Supabase Auth/Postgresで実データを管理します。

## 実装内容

- Supabaseメール認証: ログイン、メール/パスワード登録、ログアウト
- ロール制御: `profiles.role` の `admin` / `staff` により `/admin/**` と `/staff/**` を保護
- 管理者: ダッシュボード、事業所CRUD、スタッフ編集、案件CRUD、自動配置実行/保存
- スタッフ: 勤務可能日登録、自分のシフト/カレンダー確認、Webアプリ内通知確認
- 自動配置: `projects`, `profiles`, `availabilities`, `assignments` の実データで実行し、`assignment_runs` に履歴保存
- 通知: LINE通知は実装せず、`notifications` テーブルと通知作成処理を分離したWebアプリ内通知として実装

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` にSupabaseのURLとanon keyを設定します。管理者セッション署名用に `ADMIN_SESSION_SECRET` も設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_SESSION_SECRET=replace-with-long-random-secret
```

未設定の場合、ログイン画面または認証ゲートに「Supabaseに接続できません」というエラーを表示します。

## Supabase設定手順

1. Supabaseプロジェクトを作成します。
2. Supabase Dashboard > SQL Editor を開き、`supabase/schema.sql` の内容を貼り付けて **Run** を実行します。
   - `schema.sql` は既存のテーブル・enum・関連関数を削除してから再作成するため、再実行すると既存データは削除されます。
   - 管理者ログイン用の `admin_accounts` テーブルと、bcryptハッシュを `pgcrypto` の `crypt` で照合する `verify_admin_login` 関数も作成します。
3. 続けて SQL Editor の新しいクエリに `supabase/seed.sql` の内容を貼り付けて **Run** を実行します。
   - 初期データとして会社、事業所、デモ用プロフィール、案件、勤務可能日、初期管理者を投入します。
   - 初期管理者のパスワードは `admin_accounts.password_hash` にbcryptハッシュとして保存され、平文パスワードはDBに保存されません。

## ログインURLと初期認証情報

- 管理者ログインURL: `/admin/login`
  - ログインID: `admin`
  - 初期パスワード: `omega1234`
  - 管理者はメールアドレスではなく、発行されたログインIDとパスワードでログインします。
  - **本番利用前に必ず初期管理者パスワードを変更してください。**
- スタッフログインURL: `/staff/login`
  - スタッフはSupabase Authのメールアドレス / パスワードでログインします。
- スタッフ新規登録URL: `/staff/signup`
  - 名前、メールアドレス、パスワード、電話番号、所属事業所を入力すると、Supabase Authユーザーと `profiles` レコードを作成します。

## 認証設定手順

1. Supabase Dashboard > Authentication > Providers で Email provider を有効にします。
2. メール確認を必須にする場合は、登録後に確認メールを開いてからログインしてください。
3. `/admin/**` は管理者セッションcookieがない場合 `/admin/login` へリダイレクトされます。
4. `/staff/**` はスタッフログイン後に作成されるセッションcookieがない場合 `/staff/login` へリダイレクトされ、画面側でもSupabase Authセッションを確認します。
5. 画面確認用のデモルートとして `/demo/admin` と `/demo/staff` を残しています。通常の `/admin/**` と `/staff/**` はログイン必須です。

## 自動配置ルール

1. 案件ごとに配置
2. `unavailable` は除外
3. `available` を優先し、不足時に `conditional` を使用
4. 同じ日時に重なる案件へ同一スタッフを配置しない
5. 先に `leader` を `required_leaders` 人以上配置
6. その後 `required_people` まで追加配置
7. 過去配置回数が少ないスタッフを優先
8. 不足時は「リーダー不足」「人数不足」を表示

## ビルド

```bash
npm run build
```


## Demo mode notes

通常の `/admin/**` と `/staff/**` はログイン必須です。開発・画面確認用に、認証ミドルウェアの対象外となるデモルートを残しています。

- `/demo/admin`: 管理者ダッシュボードUIをデモデータで確認
- `/demo/staff`: スタッフホームUIをデモデータで確認

Mock/demo data is shown by default for the primary demo screens. When Supabase is configured and returns data, admin dashboard and project screens can display real data.
