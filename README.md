# UNCHARTED — Online Book Reading Platform

A dark, cinematic, premium book-reading site with a public reader and a
secure admin panel, built to run on Supabase (Auth + Database + Storage).
No build step — plain HTML/CSS/JS, so you can open it, host it, or drop it
straight into any static host (Netlify, Vercel, GitHub Pages, cPanel, etc.).

## What's inside

```
index.html          Public homepage (hero, book, about, reviews, footer)
reader.html          Online PDF reader (no download/print/share)
admin/index.html     Admin login
admin/dashboard.html Admin panel — manage the book + site settings
css/                 Styles
js/                  Site logic + Supabase client
supabase/schema.sql  Database tables, RLS policies, storage bucket
assets/logo.jpg      Your uploaded UNCHARTED logo (used as-is, untouched)
```

**Your assets:** the site is already wired to use these three files the
moment you place them in `assets/`, exactly by these filenames:

- `assets/hero.jpg` — hero background (picked up automatically)
- `assets/Book Cover.jpg` — the book cover shown on the homepage and in the
  reader header
- `assets/UNOCOVERED_The_chapter_01-02.pdf` — the book itself, opened by
  "Read Now →" and read page-by-page in `reader.html`

This is the **fallback/demo content**, used automatically whenever Supabase
isn't connected yet (see below) — so the site works with your real book and
cover right out of the zip, with no Supabase setup required to try it out.
Once you connect Supabase and publish a book from the admin panel, that
takes over instead.

**Important — run a local server, don't just double-click `index.html`:**
opening the file directly (`file://…`) makes some browsers block the PDF
reader from loading `UNOCOVERED_The_chapter_01-02.pdf` for security reasons.
From inside the project folder, run:
```
python3 -m http.server 8000
```
then open `http://localhost:8000` in your browser. Any static host
(Netlify, Vercel, etc.) works the same way once deployed — this only
matters when testing locally.

## 1. Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`.
   This creates the `books`, `website_settings`, and `reading_sessions`
   tables with Row Level Security, and a public `uncharted` storage bucket
   for covers, PDFs, and the logo.
3. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon public key** (never the `service_role` key).
4. Open `js/supabase-client.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
5. Go to **Authentication → Users → Add user** and create your admin login
   (email + password). Anyone signed in is treated as an admin by the RLS
   policies, so only create accounts for people you trust — there is no
   public sign-up form anywhere on this site.

Until you do this, the public site still works using built-in demo content
(Atomic Habits, placeholder settings) so you always have something to look
at — but the admin panel will show a "Supabase isn't connected yet" notice.

## 2. Add your book

Log in at `admin/index.html`, open the **Book** tab, and upload:
- Cover image
- The PDF file itself
- Title, author, description, page count
- Tick **Published** to make it live on the public site

Only one book shows on the public homepage at a time (the most recently
updated published one) — exactly as the brief specifies. The schema fully
supports adding more books later; the public site will simply keep showing
one until you build out a library view.

## 3. Website Settings tab

Controls the site name, logo, hero heading/description, about text, and the
**Facebook review URL** — edited in one place and used everywhere the button
or footer link appears, as required.

## 4. The public reader

`reader.html` renders the PDF with PDF.js directly in the browser: previous
/next page, page-number jump, zoom in/out, fullscreen, and keyboard arrow
navigation. There is intentionally no download, print, save, or share
control anywhere in the public interface, per the brief.

## 5. Deploying

Any static host works — Netlify, Vercel, Cloudflare Pages, GitHub Pages, or
your own server. Just upload the whole folder; there's nothing to build or
compile.

## 6. Security notes

- The `service_role` key is never used in this codebase — only the public
  `anon` key, which is safe to ship to the browser because every table has
  Row Level Security enabled.
- Public visitors can only **read published books** and **read** website
  settings. Writes (insert/update/delete) require a signed-in session.
- Consider rotating your admin password periodically and enabling
  Supabase's built-in email confirmation / MFA for extra safety.
