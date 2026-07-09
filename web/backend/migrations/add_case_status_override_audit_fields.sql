alter table public.case_status_history
  add column if not exists is_override boolean not null default false,
  add column if not exists override_reason text;

comment on column public.case_status_history.is_override is
  'True when an admin intentionally bypasses the normal case status transition workflow.';

comment on column public.case_status_history.override_reason is
  'Required reason supplied by an admin when is_override is true.';
