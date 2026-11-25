# HILL AND STILL V5.4 — Supabase setup

## 1. Configure the browser client
Open `supabase-config.js` and replace the placeholders with the project root URL (without `/rest/v1/`) and the `sb_publishable_...` key. Never put a `sb_secret_...` or `service_role` key in this file.

## 2. Database
The table `public.hs_discover_submissions` should contain `participant_code`, `condition`, `pre_discover`, `discover_data`, `post_discover`, `consent_to_submit`, and `created_at`. Enable RLS. The browser role should have INSERT only, with an INSERT policy requiring `consent_to_submit = true`; do not grant SELECT/UPDATE/DELETE to `anon`.

## 3. Automatic participant codes and condition assignment
Run this SQL once in Supabase SQL Editor (Database mode):

```sql
create sequence if not exists public.hs_participant_code_seq start 1;

create or replace function public.next_hs_participant_code()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select nextval('public.hs_participant_code_seq')::text;
$$;

revoke all on function public.next_hs_participant_code() from public;
grant execute on function public.next_hs_participant_code() to anon, authenticated;

notify pgrst, 'reload schema';
```

The website requests the next number from this database sequence, so different phones share one counter: `1`, `2`, `3`, and so on. Do not create the code in localStorage; that would cause duplicate numbers across devices. The research team separately selects the assigned condition A/B/C/D in the research form. The participant code no longer determines the condition. Avoid names, emails, student IDs, or other direct identifiers.

## 4. Participant flow
Participants complete the pre-Discover check-in and generate the Top 5. The website automatically requests a new participant number. A member of the research team selects the pre-assigned condition A/B/C/D, then the participant completes post-Discover ratings, checks the consent box, and presses “Xác nhận và gửi dữ liệu”. The Discover check-in no longer asks whether the audio has vocals.

## 5. Important limitation of this V5.4 build
The inspected V5.4 source has recommendation cards and feedback controls but no integrated audio player. Therefore this build records exploration of recommendations, not verified listening exposure. Do not describe the current data as a completed music-listening experiment until a real audio player and listening-duration validation are implemented.

## 6. Test
Generate one test number, submit one test record with a test condition, then inspect the table in Supabase Table Editor using the research team's authorized dashboard login. Remove test records before collecting participant data.
