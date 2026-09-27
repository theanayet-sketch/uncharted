pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let pageNum = 1;
let scale = 1.2;
let userZoomed = false;
let rendering = false;
let pendingPage = null;

const canvas = document.getElementById("pdf-canvas");
const ctx = canvas.getContext("2d");
const stage = document.querySelector(".reader-stage");
const pageInput = document.getElementById("page-num");
const pageCount = document.getElementById("page-count");
const loadingEl = document.getElementById("reader-loading");
const emptyEl = document.getElementById("reader-empty");

document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  await loadBookAndOpenPdf();
  wireControls();
});

// Fit the page to the available width on small/mobile screens so the first
// page is readable without the user having to zoom or scroll sideways.
async function fitScaleToStage() {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1 });
  const available = stage.clientWidth - 32; // account for stage padding
  const fitted = available / baseViewport.width;
  scale = Math.max(0.5, Math.min(fitted, 1.2));
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  if (userZoomed || !pdfDoc) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    await fitScaleToStage();
    queueRender(pageNum);
  }, 200);
});

async function loadBookAndOpenPdf() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  let book = DEMO_BOOK;

  if (supabaseReady) {
    let query = supabaseClient.from("books").select("*").eq("is_published", true);
    query = id ? query.eq("id", id) : query.order("created_at", { ascending: false }).limit(1);
    const { data } = await query.maybeSingle ? await query.maybeSingle() : await query.single();
    if (data) book = data;
  } else {
    const cached = id && localStorage.getItem(`uncharted_book_${id}`);
    if (cached) book = JSON.parse(cached);
  }

  document.querySelectorAll("[data-book-title]").forEach((el) => (el.textContent = book.title));

  if (!book.pdf_url) {
    loadingEl.style.display = "none";
    emptyEl.style.display = "flex";
    return;
  }

  try {
    // disableRange/disableStream: plain hosting (cPanel, basic static hosts)
    // doesn't always support byte-range requests, which pdf.js otherwise
    // relies on. Fetching the whole file at once avoids that failure mode.
    const loadingTask = pdfjsLib.getDocument({
      url: book.pdf_url,
      disableAutoFetch: false,
      disableRange: true,
      disableStream: true,
    });
    pdfDoc = await loadingTask.promise;
    pageCount.textContent = pdfDoc.numPages;
    pageInput.max = pdfDoc.numPages;
    loadingEl.style.display = "none";
    await fitScaleToStage();
    renderPage(pageNum);
  } catch (e) {
    console.error("PDF load error:", e);
    loadingEl.style.display = "none";
    emptyEl.style.display = "flex";
    emptyEl.querySelector("p").textContent = "This book couldn't be loaded. Please try again later.";
  }
}

function renderPage(num) {
  if (!pdfDoc) return;
  rendering = true;
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderTask = page.render({ canvasContext: ctx, viewport });
    renderTask.promise.then(() => {
      rendering = false;
      if (pendingPage !== null) {
        renderPage(pendingPage);
        pendingPage = null;
      }
    });
  });
  pageInput.value = num;
}

function queueRender(num) {
  if (rendering) pendingPage = num;
  else renderPage(num);
}

function wireControls() {
  document.getElementById("prev-page").addEventListener("click", () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRender(pageNum);
  });
  document.getElementById("next-page").addEventListener("click", () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRender(pageNum);
  });
  pageInput.addEventListener("change", () => {
    const n = parseInt(pageInput.value, 10);
    if (pdfDoc && n >= 1 && n <= pdfDoc.numPages) {
      pageNum = n;
      queueRender(pageNum);
    }
  });
  document.getElementById("zoom-in").addEventListener("click", () => {
    userZoomed = true;
    scale = Math.min(scale + 0.2, 3);
    queueRender(pageNum);
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    userZoomed = true;
    scale = Math.max(scale - 0.2, 0.5);
    queueRender(pageNum);
  });
  document.getElementById("fullscreen").addEventListener("click", () => {
    const el = document.querySelector(".reader-stage");
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") document.getElementById("next-page").click();
    if (e.key === "ArrowLeft") document.getElementById("prev-page").click();
  });

  // Block right-click / drag on the canvas so the page can't be trivially saved.
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}
