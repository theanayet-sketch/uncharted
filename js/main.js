document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  await hydrateSettings();
  await hydrateBook();
  wireMobileNav();
  wireYear();
});

async function hydrateSettings() {
  let settings = DEMO_SETTINGS;
  if (supabaseReady) {
    const { data } = await supabaseClient.from("website_settings").select("*").limit(1).single();
    if (data) settings = data;
  }

  document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = settings.site_name));
  document.querySelectorAll("[data-logo]").forEach((el) => (el.src = settings.logo_url || "assets/logo.jpg"));
  const heroTitleEl = document.querySelector("[data-hero-title]");
  if (heroTitleEl) {
    const parts = settings.hero_title.split(" ");
    const last = parts.pop();
    heroTitleEl.innerHTML = `${parts.join(" ")} <span class="accent">${last}</span>`;
  }
  const heroDescEl = document.querySelector("[data-hero-desc]");
  if (heroDescEl) heroDescEl.textContent = settings.hero_description;
  const aboutTextEl = document.querySelector("[data-about-text]");
  if (aboutTextEl) aboutTextEl.textContent = settings.about_text;
  document.querySelectorAll("[data-facebook-url]").forEach((el) => (el.href = settings.facebook_url));

  // The hero background already defaults to assets/hero.jpg via CSS, so it
  // shows immediately with no flash. Only override it when Supabase gives a
  // custom hero image.
  if (settings.hero_image_url) {
    document.documentElement.style.setProperty("--hero-image", `url('${settings.hero_image_url}')`);
  }
}

async function hydrateBook() {
  let book = DEMO_BOOK;
  if (supabaseReady) {
    const { data } = await supabaseClient
      .from("books")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) book = data;
  }

  const container = document.querySelector("[data-book-container]");
  if (!container) return;

  if (!book) {
    container.innerHTML = `<p style="color:var(--cream-dim)">No book is available to read yet. Please check back soon.</p>`;
    return;
  }

  document.querySelectorAll("[data-book-cover]").forEach((el) => (el.src = book.cover_url));
  document.querySelectorAll("[data-book-title]").forEach((el) => (el.textContent = book.title));
  document.querySelectorAll("[data-book-author]").forEach((el) => (el.textContent = book.author));
  document.querySelectorAll("[data-book-desc]").forEach((el) => (el.textContent = book.description));
  document.querySelectorAll("[data-book-pages]").forEach((el) => (el.textContent = `${book.page_count} Pages`));

  const readLinks = document.querySelectorAll("[data-read-link]");
  readLinks.forEach((el) => (el.href = `reader.html?id=${encodeURIComponent(book.id)}`));

  if (book.pdf_url) {
    localStorage.setItem(`uncharted_book_${book.id}`, JSON.stringify(book));
  }
}

function wireMobileNav() {
  const btn = document.querySelector(".hamburger");
  const nav = document.querySelector(".mobile-nav");
  const close = document.querySelector(".mobile-nav-close");
  if (!btn || !nav) return;
  const open = () => nav.classList.add("open");
  const shut = () => nav.classList.remove("open");
  btn.addEventListener("click", open);
  close?.addEventListener("click", shut);
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", shut));
}

function wireYear() {
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = new Date().getFullYear();
}
