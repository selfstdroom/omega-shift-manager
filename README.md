# Omega Shift Manager

オメガテクノ向けシフト管理WebアプリのMVPです。Next.js App Router、TypeScript、Tailwind CSS、Supabase接続前提で構成しています。

## 実装内容

- 共通: トップページ、仮ログイン、権限別リンク
- 管理者: ダッシュボード、事業所/スタッフ/案件の一覧・作成画面、自動配置実行、配置結果確認
- スタッフ: ホーム、勤務可能日登録、自分のシフト一覧、自分のカレンダー
- DB前提テーブル型: `companies`, `workplaces`, `profiles`, `projects`, `availabilities`, `assignment_runs`, `assignments`
- Supabaseクライアント: 環境変数未設定時は `null` になり、仮データで画面確認可能
- 自動配置ロジック: `lib/autoAssign.ts`

## 自動配置ルール

1. 案件ごとに配置
2. `unavailable` は除外
3. `available` を優先し、不足時に `conditional` を使用
4. 同じ日時に重なる案件へ同一スタッフを配置しない
5. 先に `leader` を `required_leaders` 人以上配置
6. その後 `required_people` まで追加配置
7. 過去配置回数が少ないスタッフを優先
8. 不足時は「リーダー不足」「人数不足」を表示

## セットアップ

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` には必要に応じて以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## ビルド

```bash
npm run build
```

## Supabase接続方針

現時点ではMVP優先のため `data/mockData.ts` の仮データを各画面で使用しています。後続で `lib/supabase.ts` のクライアントを使って、同じ型定義に沿って各テーブルから取得する実装へ差し替えます。
