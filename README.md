# SMOC Carols 2K26

A React/Vite digital carol-book starter using the supplied church logo and the three supplied songs.

## Run locally
1. Install Node.js 20+.
2. In this folder run `npm install`.
3. Run `npm run dev`.
4. Open the local URL shown by Vite.

The public book works in demo mode using `src/songs.json`. Cloud editing, login and cross-device live updates require Supabase.

## Connect Supabase
1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL Editor.
3. Create ONE administrator in Supabase Auth (disable public signups).
4. Set that user's `app_metadata.role` to `admin` using the Supabase server-side admin interface / service role. Never put a service-role key in this frontend.
5. Copy `.env.example` to `.env` and fill in the project URL and anon key.
6. Restart the Vite server.

Important: the included SQL policies require the authenticated user's app_metadata role to equal `admin`. Do not use user-editable metadata for this role. Disable public sign-up and keep admin provisioning private.

## Deploy
Deploy the project to Vercel or another static frontend host. Add the two VITE_SUPABASE_* environment variables in the hosting dashboard. Connect a custom domain if desired, then share that one permanent URL in WhatsApp.

## Notes before production
- Test the Supabase policies with a reader account and the single admin account.
- Configure database backups and appropriate Supabase plan limits.
- Run a 100-user load test against the deployed project before relying on it for an event.
- PDF export is currently a clean text-first PDF; final print styling, exact pagination and logo placement should be reviewed before printing.
- Song page numbers are estimated from a configurable line-count rule in this starter, not yet typeset to exact physical-page overflow. Review pagination after the final lyrics are added.
- The provided lyric text has been entered as supplied; check spelling/transliteration with your choir before publishing.
