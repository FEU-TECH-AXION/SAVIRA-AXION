alter table support_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_mime_type text;

notify pgrst, 'reload schema';
