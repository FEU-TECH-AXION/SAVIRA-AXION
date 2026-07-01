do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'support_messages'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%resolved%';

  if constraint_name is not null then
    execute format('alter table support_messages drop constraint %I', constraint_name);
  end if;
end $$;

alter table support_messages
  add constraint support_messages_status_check
  check (status in ('open', 'replied', 'resolved', 'archived'));

notify pgrst, 'reload schema';
