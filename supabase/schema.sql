-- Supabase SQL Editor で実行（2名共有用）
create table if not exists workspace_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 行レベルセキュリティは OFF（Next.js サーバーが service role でアクセス）
alter table workspace_state disable row level security;
