document.addEventListener("DOMContentLoaded", () => {
  const client = initSupabase();
  const onLoginPage = document.getElementById("login-form");
  const onDashboard = document.getElementById("dashboard");

  if (!client) {
    showConfigWarning();
    return;
  }

  if (onLoginPage) wireLogin(client);
  if (onDashboard) wireDashboard(client);
});

function showConfigWarning() {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0a0a;color:#f3ede1;font-family:Inter,sans-serif;text-align:center">
      <div style="max-width:440px">
        <h2 style="font-family:'Playfair Display',serif;margin-bottom:14px">Supabase isn't connected yet</h2>
        <p style="color:#b8ad9c;line-height:1.6">Open <code>js/supabase-client.js</code> and add your project URL and anon key, then run the SQL in <code>/supabase/schema.sql</code> against your project. See README.md for the full setup.</p>
      </div>
    </div>`;
}

/* ---------------- Login ---------------- */
function wireLogin(client) {
  client.auth.getSession().then(({ data }) => {
    if (data.session) location.href = "dashboard.html";
  });

  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    const { error } = await client.auth.signInWithPassword({ email, password });
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";

    if (error) {
      errorEl.textContent = "Invalid email or password.";
      return;
    }
    location.href = "dashboard.html";
  });
}

/* ---------------- Dashboard ---------------- */
async function wireDashboard(client) {
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    location.href = "index.html";
    return;
  }
  document.getElementById("admin-email").textContent = sessionData.session.user.email;

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await client.auth.signOut();
    location.href = "index.html";
  });

  wireTabs();
  await loadBookForm(client);
  await loadSettingsForm(client);
  wireBookForm(client);
  wireSettingsForm(client);
}

function wireTabs() {
  const tabs = document.querySelectorAll(".admin-tab");
  const panels = document.querySelectorAll(".admin-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });
}

let currentBookId = null;

async function loadBookForm(client) {
  const { data } = await client
    .from("books")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const form = document.getElementById("book-form");
  if (data) {
    currentBookId = data.id;
    form.title.value = data.title || "";
    form.author.value = data.author || "";
    form.description.value = data.description || "";
    form.page_count.value = data.page_count || "";
    form.is_published.checked = !!data.is_published;
    if (data.cover_url) document.getElementById("cover-preview").src = data.cover_url;
    if (data.pdf_url) document.getElementById("current-pdf").textContent = data.pdf_url.split("/").pop();
  }
}

function wireBookForm(client) {
  const form = document.getElementById("book-form");
  const coverInput = document.getElementById("cover-input");
  const pdfInput = document.getElementById("pdf-input");
  const status = document.getElementById("book-status");

  coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];
    if (file) document.getElementById("cover-preview").src = URL.createObjectURL(file);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Saving…";

    let cover_url, pdf_url;
    try {
      if (coverInput.files[0]) {
        cover_url = await uploadFile(client, "covers", coverInput.files[0]);
      }
      if (pdfInput.files[0]) {
        pdf_url = await uploadFile(client, "pdfs", pdfInput.files[0]);
        document.getElementById("current-pdf").textContent = pdfInput.files[0].name;
      }
    } catch (err) {
      status.textContent = "Upload failed: " + err.message;
      return;
    }

    const payload = {
      title: form.title.value.trim(),
      author: form.author.value.trim(),
      description: form.description.value.trim(),
      page_count: parseInt(form.page_count.value, 10) || 0,
      is_published: form.is_published.checked,
      updated_at: new Date().toISOString(),
    };
    if (cover_url) payload.cover_url = cover_url;
    if (pdf_url) payload.pdf_url = pdf_url;

    let error;
    if (currentBookId) {
      ({ error } = await client.from("books").update(payload).eq("id", currentBookId));
    } else {
      payload.created_at = new Date().toISOString();
      const res = await client.from("books").insert(payload).select().single();
      error = res.error;
      if (res.data) currentBookId = res.data.id;
    }

    status.textContent = error ? "Error: " + error.message : "Saved ✓";
    if (!error) setTimeout(() => (status.textContent = ""), 2500);
  });

  document.getElementById("delete-book-btn").addEventListener("click", async () => {
    if (!currentBookId) return;
    if (!confirm("Delete this book? This cannot be undone.")) return;
    const { error } = await client.from("books").delete().eq("id", currentBookId);
    status.textContent = error ? "Error: " + error.message : "Deleted.";
    if (!error) {
      currentBookId = null;
      document.getElementById("book-form").reset();
    }
  });
}

async function uploadFile(client, folder, file) {
  const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const { error } = await client.storage.from("uncharted").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = client.storage.from("uncharted").getPublicUrl(path);
  return data.publicUrl;
}

async function loadSettingsForm(client) {
  const { data } = await client.from("website_settings").select("*").limit(1).maybeSingle();
  const form = document.getElementById("settings-form");
  if (data) {
    form.site_name.value = data.site_name || "";
    form.hero_title.value = data.hero_title || "";
    form.hero_description.value = data.hero_description || "";
    form.about_text.value = data.about_text || "";
    form.facebook_url.value = data.facebook_url || "";
    if (data.logo_url) document.getElementById("logo-preview").src = data.logo_url;
  }
}

function wireSettingsForm(client) {
  const form = document.getElementById("settings-form");
  const logoInput = document.getElementById("logo-input");
  const status = document.getElementById("settings-status");

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (file) document.getElementById("logo-preview").src = URL.createObjectURL(file);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Saving…";

    let logo_url;
    try {
      if (logoInput.files[0]) logo_url = await uploadFile(client, "branding", logoInput.files[0]);
    } catch (err) {
      status.textContent = "Upload failed: " + err.message;
      return;
    }

    const { data: existing } = await client.from("website_settings").select("id").limit(1).maybeSingle();
    const payload = {
      site_name: form.site_name.value.trim(),
      hero_title: form.hero_title.value.trim(),
      hero_description: form.hero_description.value.trim(),
      about_text: form.about_text.value.trim(),
      facebook_url: form.facebook_url.value.trim(),
      updated_at: new Date().toISOString(),
    };
    if (logo_url) payload.logo_url = logo_url;

    let error;
    if (existing) ({ error } = await client.from("website_settings").update(payload).eq("id", existing.id));
    else ({ error } = await client.from("website_settings").insert(payload));

    status.textContent = error ? "Error: " + error.message : "Saved ✓";
    if (!error) setTimeout(() => (status.textContent = ""), 2500);
  });
}
