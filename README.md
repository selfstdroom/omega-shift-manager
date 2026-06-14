# Omega Shift Manager

オメガテクノ向けシフト管理Webアプリです。Next.js App Router、TypeScript、Tailwind CSS、Supabase Auth/Postgresで実データを管理します。

## 実装内容

- Supabaseメール認証: ログイン、メール/パスワード登録、ログアウト
- ロール制御: `profiles.role` の `admin` / `staff` により `/admin/**` と `/staff/**` を保護
- 管理者: ダッシュボード、事業所CRUD、スタッフ編集、案件CRUD、自動配置実行/保存
- スタッフ: 勤務可能日登録、自分のシフト/カレンダー確認
- 自動配置: `projects`, `profiles`, `availabilities`, `assignments` の実データで実行し、`assignment_runs` に履歴保存

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` にSupabaseのURLとanon keyを設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

未設定の場合、各画面に「Supabase未接続」のエラーを表示します。

## Supabase設定手順

1. Supabaseプロジェクトを作成します。
2. Supabase Dashboard > SQL Editor を開き、`supabase/schema.sql` の内容を貼り付けて **Run** を実行します。
   - `schema.sql` は既存のテーブル・enum・関連関数を削除してから再作成するため、再実行すると既存データは削除されます。
3. 続けて SQL Editor の新しいクエリに `supabase/seed.sql` の内容を貼り付けて **Run** を実行します。
   - 初期データとして、会社「オメガテクノ」、事業所「本社」「茨城営業所」、管理者1名、スタッフ10名（うちリーダー3名）、案件5件、勤務可能日データを投入します。
   - `profiles.id` は `auth.users(id)` と連携するため、seedではデモ用の認証ユーザーも作成します。
4. seedで作成されるデモユーザーは次の認証情報でログインできます。

| 種別 | メールアドレス | パスワード |
| --- | --- | --- |
| 管理者 | `admin@omega-techno.example` | `password123` |
| スタッフ | `staff01@omega-techno.example` 〜 `staff10@omega-techno.example` | `password123` |

本番用の管理者を作成する場合は、Authenticationでユーザーを作成後、該当する `auth.users.id` を使って `profiles` に以下のようなレコードを追加します。

```sql
insert into public.profiles (id, company_id, workplace_id, name, role, staff_role)
values ('AUTH_USER_ID', 'COMPANY_ID', 'WORKPLACE_ID', '管理者', 'admin', 'leader');
```

## 認証設定手順

1. Supabase Dashboard > Authentication > Providers で Email provider を有効にします。
2. メール確認を必須にする場合は、登録後に確認メールを開いてからログインしてください。
3. スタッフは `/login` の新規登録からメール/パスワード登録できます。登録時は最初の `workplaces` に紐づく `staff` として `profiles` を作成します。
4. 管理者は `/admin/staff` から `staff_role` を `staff` / `leader` に変更できます。

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


## ログイン方式

- 管理者ログイン: `/admin/login`
  - 初期管理者ID: `admin`
  - 初期管理者パスワード: `omega1234`
  - 管理者はメールアドレスではなく、発行されたログインIDとパスワードでログインします。
  - 本番利用前に初期管理者パスワードを必ず変更してください。
- スタッフログイン: `/staff/login`
  - スタッフは従来どおり Supabase Auth のメールアドレス / パスワードでログイン・登録します。
