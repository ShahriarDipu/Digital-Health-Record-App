-- Enable Row Level Security on all app tables.
-- Blocks Supabase anon/authenticated REST API access (no policies = deny all).
-- Prisma connects as the postgres DB owner and bypasses RLS — the Next.js app is unaffected.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Revoke default API role grants Supabase adds to public tables
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.verification_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.visits FROM anon, authenticated;
REVOKE ALL ON TABLE public.reminders FROM anon, authenticated;
REVOKE ALL ON TABLE public.blog_posts FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_logs FROM anon, authenticated;
