alter table users
  add column if not exists profile_img_updated_at timestamptz,
  add column if not exists profiles_img_updated_at timestamptz;

