const practicals = [
  {
    id: "P1",
    title: "P1",
    name: "Aim: Configure IP SLA tracking and path control topology.",
    text: "1.txt",
    image: "P1.png",
    badgeText: "P1"
  },
  {
    id: 2,
    title: "Practical 2",
    name: "Aim: Implementation of BGP using AS_path attribute.",
    text: "2.txt",
    image: "P2.png",
    badgeText: "Practical 2"
  },
  {
    id: 3,
    title: "Practical 3",
    name: "Aim: Configure IP SLA tracking and path control topology.",
    text: "3.txt",
    image: "P3.png",
    badgeText: "Practical 3"
  },
  {
    id: 4,
    title: "Practical 4",
    name: "Aim: Secure management plane.",
    text: "4.txt",
    image: "P4.png",
    badgeText: "Practical 4"
  },
  {
    id: 5,
    title: "Practical 5",
    name: "Aim: Configure and verify path control using PBR (Policy Based Routing).",
    text: "5.txt",
    image: "P5.png",
    badgeText: "Practical 5"
  },
  {
    id: 6,
    title: "Practical 6",
    name: "Aim: Demonstrate inter vlan routing.",
    text: "6.txt",
    image: "P6.png",
    badgeText: "Practical 6",
    extraDownload: {
      label: "Download Code",
      href: "6.pkt"
    }
  },
  {
    id: 8,
    title: "Practical 8",
    name: "Aim: Simulating MPLS environment.",
    text: "8.txt",
    image: "P8.jpg",
    badgeText: "Practical 8"
  }
];
const practicalsGrid = document.getElementById("practicalsGrid");
const searchInput = document.getElementById("searchInput");
const loaderOverlay = document.getElementById("loaderOverlay");
const themeToggle = document.getElementById("themeToggle");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const scrollTopBtn = document.getElementById("scrollTop");

const state = {
  currentPractical: null,
  theme: localStorage.getItem("theme") || "dark"
};

let activePreviewToken = 0;
let previewClickLocked = false;
let previewLockTimer = null;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setTheme(theme) {
  state.theme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  themeToggle.textContent = theme === "dark" ? "🌙" : "☀️";
}

function renderPracticals(filter = "") {
  const term = filter.trim().toLowerCase();
  const filtered = practicals.filter((item) => {
    return (
      String(item.id).toLowerCase().includes(term) ||
      item.title.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term)
    );
  });

  if (!filtered.length) {
    practicalsGrid.innerHTML = `
      <div class="empty-state">
        <h3>No practicals found</h3>
        <p>Try searching by a different number or title.</p>
      </div>
    `;
    return;
  }

  practicalsGrid.innerHTML = filtered
    .map(
      (item) => `
        <article class="card">
          <span class="card-badge">${item.badgeText}</span>
          <h3>${item.title}</h3>
          <p class="card-name">${item.name}</p>
          <p class="card-file">${item.text}</p>
          <div class="card-actions">
            <button class="action-btn preview" data-action="preview" data-id="${item.id}">Preview</button>
            <a class="action-btn download" href="${item.text}" download>Download Notes</a>
            ${item.extraDownload ? `<a class="action-btn download" href="${item.extraDownload.href}" download>${item.extraDownload.label}</a>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function showLoader() {
  loaderOverlay.classList.remove("hidden");
}

function hideLoader() {
  window.setTimeout(() => {
    loaderOverlay.classList.add("hidden");
  }, 300);
}

function resetModalContent() {
  modalBody.innerHTML = "";
  modalBody.scrollTop = 0;
}

function renderModalContent(practical, text) {
  resetModalContent();

  const image = document.createElement("img");
  image.src = practical.image;
  image.alt = practical.title;
  image.className = "modal-image";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("click", () => {
    image.classList.toggle("zoomed");
  });

  const title = document.createElement("h2");
  title.className = "modal-title";
  title.textContent = practical.title;

  const meta = document.createElement("p");
  meta.className = "modal-meta";
  meta.textContent = `${practical.name} • ${practical.text}`;

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "action-btn modal-copy-btn";
  copyButton.textContent = "Copy text";
  copyButton.addEventListener("click", async () => {
    const content = pre.textContent;
    try {
      await navigator.clipboard.writeText(content);
      copyButton.textContent = "Copied!";
      copyButton.disabled = true;
      window.setTimeout(() => {
        copyButton.textContent = "Copy text";
        copyButton.disabled = false;
      }, 1500);
    } catch (error) {
      copyButton.textContent = "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = "Copy text";
      }, 1500);
    }
  });

  const pre = document.createElement("pre");
  pre.id = "modalText";
  pre.textContent = text || "No content available for this practical yet.";

  modalBody.appendChild(image);
  modalBody.appendChild(title);
  modalBody.appendChild(meta);
  modalBody.appendChild(copyButton);
  modalBody.appendChild(pre);
}

function showModalLoading() {
  resetModalContent();
  modalBody.innerHTML = `
    <div class="modal-loader" id="modalLoader">
      <div class="spinner"></div>
      <p>Loading content...</p>
    </div>
  `;
}

function lockPreviewClicks() {
  if (previewClickLocked) return false;
  previewClickLocked = true;
  if (previewLockTimer) window.clearTimeout(previewLockTimer);
  previewLockTimer = window.setTimeout(() => {
    previewClickLocked = false;
  }, 400);
  return true;
}

async function openModal(practical) {
  if (!practical || !lockPreviewClicks()) return;

  const requestId = ++activePreviewToken;
  state.currentPractical = practical;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  showModalLoading();

  try {
    const response = await fetch(practical.text, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load note content.");
    const text = await response.text();

    if (requestId !== activePreviewToken || !modal.classList.contains("active")) return;
    renderModalContent(practical, text);
  } catch (error) {
    if (requestId === activePreviewToken && modal.classList.contains("active")) {
      renderModalContent(practical, "The note content could not be loaded right now.");
    }
  }
}

function closeModal() {
  activePreviewToken += 1;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  resetModalContent();
  state.currentPractical = null;
}

function handleScroll() {
  if (window.scrollY > 480) {
    scrollTopBtn.classList.add("show");
  } else {
    scrollTopBtn.classList.remove("show");
  }
}

practicalsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action='preview']");
  if (!button) return;
  const practical = practicals.find((item) => String(item.id) === button.dataset.id);
  if (practical) openModal(practical);
});

searchInput.addEventListener("input", (event) => {
  const value = event.target.value;
  window.requestAnimationFrame(() => renderPracticals(value));
});

themeToggle.addEventListener("click", () => {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target.matches(".modal-backdrop") || event.target.matches(".modal")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", handleScroll);
window.addEventListener("load", () => {
  setTheme(state.theme);
  renderPracticals();
  handleScroll();
  hideLoader();
});

showLoader();
