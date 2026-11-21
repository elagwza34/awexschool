alter table public.site_settings
  add column social_links jsonb not null default '{}'::jsonb
  check (jsonb_typeof(social_links) = 'object');
