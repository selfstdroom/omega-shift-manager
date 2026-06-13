# Omega Shift Manager

オメガテクノ向けシフト管理 Web アプリの MVP です。Next.js App Router、TypeScript、Tailwind CSS、Supabase を前提に、管理者の案件・スタッフ管理、スタッフの勤務可否登録、自動配置、Google カレンダー予定作成 URL 連携までを確認できます。

## 作成した画面

### 管理者

- `/admin` 管理者ダッシュボード
- `/admin/workplaces` 事業所一覧・作成導線
- `/admin/workplaces/new` 事業所作成フォーム
- `/admin/staff` スタッフ一覧・作成導線
- `/admin/staff/new` スタッフ作成フォーム（`staff` / `leader` を選択）
- `/admin/projects` 案件一覧
- `/admin/projects/new` 案件作成フォーム
- `/admin/auto-assign` 案件ごとの自動配置実行画面
- `/admin/assignments` 配置結果確認画面（リーダー不足・人数不足を警告）

### スタッフ

- `/staff` スタッフホーム
- `/staff/availability` 案件ごとの勤務可否・メモ登録画面
- `/staff/shifts` 自分のシフト一覧（Google カレンダー追加ボタン付き）
- `/staff/calendar` カレンダー形式のシフト表示（Google カレンダー追加ボタン付き）

## セットアップ方法

```bash
npm install
cp .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## `.env.local` の作り方

`.env.example` をコピーして、Supabase プロジェクトの値に置き換えてください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` はブラウザ側クライアントで使います。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側の管理操作用です。ブラウザに公開しないでください。
- Supabase 未設定でも、画面は `data/mockData.ts` のデモデータで確認できます。

## Supabase `schema.sql` の実行方法

1. Supabase ダッシュボードを開きます。
2. 対象プロジェクトの SQL Editor を開きます。
3. `supabase/schema.sql` の内容を貼り付けて実行します。

作成される enum:

- `user_role`: `admin` / `staff`
- `staff_role`: `staff` / `leader`
- `availability_status`: `available` / `conditional` / `unavailable`
- `assignment_status`: `draft` / `confirmed`

作成されるテーブル:

- `companies`
- `workplaces`
- `profiles`
- `projects`
- `availabilities`
- `assignment_runs`
- `assignments`

## `seed.sql` の実行方法

`schema.sql` 実行後、Supabase SQL Editor で `supabase/seed.sql` を実行します。

投入される初期データ:

- 会社: オメガテクノ
- 事業所: 本社、茨城営業所
- 管理者 1 名
- スタッフ 10 名（うちリーダー 3 名）
- 案件 5 件
- 勤務可能日データ

## ローカル起動方法

```bash
npm run dev
```

本番ビルド相当の確認:

```bash
npm run build
```

このリポジトリの `npm run build` は、MVP の必須ファイルが揃っているかを検査します。依存関係がインストール済みの環境では `npm run next:build` で Next.js のビルドも実行できます。

## 自動配置ルール

`lib/autoAssign.ts` に実装しています。

1. 案件ごとに `required_people` 人を配置します。
2. `required_leaders` 人以上の `leader` を先に配置します。
3. `leader` が足りない場合は `leader_shortage` を返します。
4. `required_people` が満たせない場合は `people_shortage` を返します。
5. `available` を優先します。
6. `conditional` は `available` で足りない場合のみ使います。
7. `unavailable` は使いません。
8. 同じ日時に重なる案件には同一スタッフを配置しません。
9. 過去の `assignments` 件数が少ないスタッフを優先します。
10. 同点の場合は名前順で安定ソートします。
11. 結果は `assignments` に `draft` として保存する想定です。
12. 再実行時は対象案件の既存 `draft assignments` を置き換えます。

## Google カレンダー連携

OAuth 連携の前段階として、`/staff/shifts` と `/staff/calendar` に Google Calendar の予定作成 URL を開くボタンを実装しています。クリックすると、案件名・勤務日時・勤務場所・備考を予定作成画面に渡します。

## 次にやるべきこと

- Supabase Auth と `profiles.id = auth.users.id` の連携
- 画面フォームの Server Actions 化と実 DB への保存
- Row Level Security ポリシーの追加
- `assignment_runs` の履歴画面
- 確定済みシフトへの変更フローと通知
