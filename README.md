# Digital Health Record App (Health Stack BD)

Shastha Sathi / Health Stack BD — AI-assisted digital health records for prescriptions, lab reports, visits, and reminders.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind
- NextAuth, Prisma, Supabase PostgreSQL
- Google Gemini for scan/analysis

## Setup

1. Copy `.env.local.example` → `.env.local` and fill in secrets  
2. `npm install`  
3. `npx prisma db push`  
4. `npm run dev`

Do not commit `.env.local`.
