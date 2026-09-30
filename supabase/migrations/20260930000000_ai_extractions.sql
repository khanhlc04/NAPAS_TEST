-- Nhật ký mỗi lần AI đọc email (spec 06). Chỉ server của Hub truy cập, bằng service role key.
create table public.ai_extractions (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null,
  attempt int not null,
  input_hash text not null,
  model text not null,
  output jsonb,
  confidence numeric,
  outcome text not null check (outcome in ('filled', 'asked', 'not_request', 'failed')),
  missing_fields text[] not null default '{}',
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);

create index ai_extractions_issue_key_idx on public.ai_extractions (issue_key, created_at desc);

-- Bật RLS và không tạo policy nào: trình duyệt không đọc được, chỉ service role đọc/ghi.
alter table public.ai_extractions enable row level security;
