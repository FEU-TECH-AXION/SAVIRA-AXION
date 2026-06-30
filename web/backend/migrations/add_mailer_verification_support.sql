alter table users
  add column if not exists is_email_verified boolean not null default false;

create table if not exists email_verification_codes (
  verification_id uuid primary key,
  email text not null,
  code text not null,
  purpose text not null check (purpose in ('signup', 'login', 'email_change')),
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_email_verification_codes_lookup
  on email_verification_codes (email, purpose, code, expires_at);

create index if not exists idx_email_verification_codes_daily_limit
  on email_verification_codes (email, purpose, sent_at);

create table if not exists support_messages (
  message_id uuid primary key,
  source text not null check (source in ('contact', 'bug_report')),
  status text not null default 'open' check (status in ('open', 'replied', 'resolved')),
  user_id varchar references users(user_id) on delete set null,
  first_name text,
  last_name text,
  email text not null,
  phone text,
  subject text,
  message text not null,
  page_url text,
  attachment_name text,
  attachment_path text,
  attachment_mime_type text,
  replies jsonb not null default '[]'::jsonb,
  resolved_by varchar references users(user_id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_messages_source_status
  on support_messages (source, status, created_at desc);

grant usage on schema public to anon, authenticated, service_role;
grant all on table email_verification_codes to service_role;
grant select, insert, update, delete on table support_messages to service_role;
grant insert on table support_messages to anon, authenticated;

notify pgrst, 'reload schema';
