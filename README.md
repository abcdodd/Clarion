# Clarion v58.1 (Full site package)
Built: 2025-09-19T17:44:23.321911

## What changed
- Safe router to prevent login bounce loops
- Role resolution order with **email overrides for Dan and Andrew** to stop "LSP shunt"
- Post-auth picker keeps session choice via sessionStorage
- Login page (email/password) with inline error display
- Admin stubs (no styling changes)

## How to deploy
1) Upload EVERYTHING in this zip to your `public_html` (replace existing files).
2) Ensure your global `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY` are set somewhere you already use.
3) Test flow:
   - /login_basic.html?next=/post-auth.html
   - /post-auth.html?reset=1&pick=1&debug=1 (one-time)
4) For Dan: the router forces **admin** role by email until metadata is consistent.

## Rollback
Replace /js/dashboard_choice_respect_v58.js with your previous version.
