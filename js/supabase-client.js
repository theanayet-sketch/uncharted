/* ==========================================================================
   Supabase configuration
   Fill these in from Project Settings → API in your Supabase dashboard.
   Only the URL and the PUBLIC anon key ever go here — never the
   service_role key. The anon key is safe to ship to the browser as long
   as Row Level Security policies (see /supabase/schema.sql) are enabled.
   ========================================================================== */
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;
let supabaseReady = false;

function initSupabase() {
  if (
    typeof window.supabase === "undefined" ||
    SUPABASE_URL.startsWith("YOUR_") ||
    SUPABASE_ANON_KEY.startsWith("YOUR_")
  ) {
    supabaseReady = false;
    return null;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
  return supabaseClient;
}

/* Fallback demo data used only when Supabase hasn't been configured yet,
   so the site is always viewable out of the box. Once you connect
   Supabase and publish a book + settings row, this is ignored entirely. */
const DEMO_BOOK = {
  id: "demo",
  title: "Uncovered",
  author: "MD Al Shihad",
  description:
    "Some mysteries aren't meant to be solved — they're meant to be felt. A sudden sunshower, a mysterious girl in an 1800s gown who vanishes without a trace, and a teenager named Abrar drawn into a mystery that blurs time, reality and something far stranger. A fantasy / mystery / sci-fi tale, currently available as its opening chapters.",
  cover_url: "assets/Book%20Cover.jpg",
  // Embedded as a data URI (see js/book-pdf-data.js) instead of a plain file
  // path, so the reader works even opened directly from disk or on hosts
  // that don't serve byte-range requests correctly for the plain file.
  pdf_url:
    typeof UNCHARTED_DEMO_PDF_BASE64 !== "undefined"
      ? `data:application/pdf;base64,${UNCHARTED_DEMO_PDF_BASE64}`
      : "assets/UNOCOVERED_The_chapter_01-02.pdf",
  page_count: 17,
  is_published: true,
};

const DEMO_SETTINGS = {
  site_name: "UNCHARTED",
  logo_url: "assets/logo.jpg",
  hero_title: "Knowledge Has No Limits",
  hero_description: "Uncharted is a simple and beautiful platform to read and explore books online.",
  about_text:
    "Uncharted is a simple and beautiful platform created for readers who want to discover and read books online in a clean and distraction-free environment.",
  facebook_url: "https://facebook.com/",
};
