# SafeShare

Share your contact info safely: create a **timed, cancellable share**, hand someone a **QR code**, and your details are only revealed after the release date/time you pick. Cancel any time and the other person sees your cancel message instead.

Built with **Supabase** (auth + Postgres + Row Level Security) and plain **HTML/CSS/JS** hosted on **GitHub Pages**. No build step.

## How it works

```
signup (email+password) → Supabase sends confirmation email → verify
        → fill profile (name, email, phone, address, socials)
        → create share: pick fields + release date/time + messages
        → QR code / link → other person scans → s.html?t=<token>
              ├─ before release time : countdown page
              ├─ after release time  : your selected info + your message
              └─ if you cancelled    : your cancel message
```

- The release check runs **server-side in Postgres** (a `security definer` RPC), so the payload can't be read early by manipulating the browser.
- Public visitors have **no direct table access** (RLS); they can only call `get_public_share(token)` with an unguessable 128-bit token.
- Each user can only read/write their **own** profile and shares (RLS policies on `auth.uid()`).

## Setup

### 1. Supabase project

1. Create a project at <https://supabase.com>.
2. In the **SQL editor**, run `supabase/migrations/0001_init.sql` (creates tables, RLS policies, and the public RPC).
3. Auth is email+password by default. Keep **Auth → Providers → Email → "Confirm email"** enabled — only confirmed users can create shares (the app checks `email_confirmed_at`).
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.

### 2. Configure the frontend

Edit `js/config.js` and paste the URL and anon key:

```js
window.SAFESHARE_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-PUBLIC-ANON-KEY',
  SITE_URL: ''   // '' = auto-detect (recommended on GitHub Pages)
};
```

The anon key is safe to ship in the frontend: RLS ensures it can only ever touch data through the rules above.

### 3. Deploy to GitHub Pages

Push this repo to GitHub (public repo, `main` branch). The included
`.github/workflows/pages.yml` automatically deploys the repo root to
GitHub Pages on every push. Your site will be at:

```
https://<your-username>.github.io/<repo-name>/
```

QR codes automatically use that URL (via `SITE_URL` auto-detection).

### 4. Local development

Serve the repo root with any static server, e.g.:

```bash
python3 -m http.server 8080
# open http://127.0.0.1:8080
```

Point `js/config.js` at your Supabase project (or a local `supabase start` stack).

## Files

| Path | Purpose |
|---|---|
| `index.html` | Landing page |
| `signup.html` / `login.html` | Supabase email+password auth, email confirmation + resend |
| `profile.html` | Edit share name, email, phone, address, socials |
| `dashboard.html` | List of shares with status, links, cancel |
| `share_new.html` | Create a share: fields, release time, messages |
| `share_view.html` | Owner view: QR code (PNG download), public link, cancel form |
| `s.html?t=<token>` | Public scan target: countdown → info, or cancel message |
| `js/common.js` | Supabase client, field catalog, QR rendering, auth guards |
| `supabase/migrations/0001_init.sql` | Tables, RLS, public RPC — run once in Supabase |
| `.github/workflows/pages.yml` | GitHub Pages auto-deploy |

## Security notes

- Passwords are handled entirely by Supabase Auth (never stored by this app).
- Share tokens are 128-bit random (`gen_random_bytes(16)`), unique, and act as capability URLs.
- All owner data access goes through RLS; anonymous access is limited to the single `get_public_share` function.
- The release-time comparison happens in the database (`now() < release_at`), not in the client.
