create table if not exists notifications (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(user_id) on delete cascade,
  title text not null,
  body text,
  message text,
  type text not null default 'system',
  link text,
  priority text not null default 'normal',
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  is_important boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on notifications(user_id, is_read);

notify pgrst, 'reload schema';
