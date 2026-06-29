alter table email_verification_codes
  drop constraint if exists email_verification_codes_purpose_check;

alter table email_verification_codes
  add constraint email_verification_codes_purpose_check
  check (purpose in ('signup', 'login', 'email_change', 'password_reset'));

notify pgrst, 'reload schema';
