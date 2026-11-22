const APP_VERSION = "lokaler Stand (dev)";
const STORAGE_KEY = "watchlist_kurator_items_v4";
const SEEN_TITLES_STORAGE = "watchlist_kurator_seen_titles_v2";
const SEEN_TITLES_LEGACY_STORAGE = "watchlist_kurator_seen_titles_v1";
const API_KEY_STORAGE = "watchlist_kurator_gemini_key_v1";
const ACTIVE_PROVIDERS_STORAGE = "watchlist_kurator_active_providers_v1";
const PROVIDERS = [
  "Sky",
  "Netflix",
  "ARD",
  "ZDF",
  "Tresat",
  "Joyn",
  "Netzkino",
  "Prime Video",
  "HBO Max",
  "Apple TV",
  "Rakuten TV",
  "Sonstiges"
];
const MEDIATHEK_FREE_PROVIDERS = ["ARD", "ZDF", "Tresat", "Joyn", "Netzkino"];
const RATINGS = ["Nicht gefällt mir", "Gefällt mir", "Finde ich super"];

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
if (!Array.isArray(items) || items.length === 0) {
  items = [
    { id: crypto.randomUUID(), title: "Dark", type: "Serie", provider: "Netflix", rating: "Finde ich super" },
    { id: crypto.randomUUID(), title: "Tatort", type: "Serie", provider: "ARD", rating: "Gefällt mir" }
  ];
  saveItems();
}

function loadSeenEntries() {
  const rawV2 = localStorage.getItem(SEEN_TITLES_STORAGE);
  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => {
            if (typeof entry === "string") {
              return { title: stripMarkdown(entry), type: null };
            }
            if (entry && typeof entry === "object" && entry.title) {
              return {
                title: stripMarkdown(entry.title),
                type: entry.type ? normalizeMediaType(entry.type) : null
              };
            }
            return null;
          })
          .filter((e) => e && e.title);
      }
    } catch {
      // ignore
    }
  }
  const rawLegacy = localStorage.getItem(SEEN_TITLES_LEGACY_STORAGE);
  if (rawLegacy) {
    try {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy)) {
        const migrated = parsedLegacy
          .filter((t) => typeof t === "string" && stripMarkdown(t))
          .map((t) => ({ title: stripMarkdown(t), type: null }));
        localStorage.setItem(SEEN_TITLES_STORAGE, JSON.stringify(migrated));
        return migrated;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

let seenEntries = loadSeenEntries();

let enabledProviders = JSON.parse(localStorage.getItem(ACTIVE_PROVIDERS_STORAGE) || "null");
if (!Array.isArray(enabledProviders)) {
  enabledProviders = [...PROVIDERS];
  saveEnabledProviders();
} else {
  enabledProviders = enabledProviders.filter((p) => PROVIDERS.includes(p));
}

const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const views = Array.from(document.querySelectorAll(".view"));
const watchlistCountEl = document.getElementById("watchlistCount");
const seenCountEl = document.getElementById("seenCount");
const activeProvidersCountEl = document.getElementById("activeProvidersCount");
const activeProviderSummaryEl = document.getElementById("activeProviderSummary");
const providerToggleGrid = document.getElementById("providerToggleGrid");
const selectAllProvidersBtn = document.getElementById("selectAllProvidersBtn");
const selectMediathekenBtn = document.getElementById("selectMediathekenBtn");
const clearProvidersBtn = document.getElementById("clearProvidersBtn");

const watchlistContainer = document.getElementById("watchlistContainer");
const seenContainer = document.getElementById("seenContainer");
const addForm = document.getElementById("addForm");
const titleInput = document.getElementById("titleInput");
const typeInput = document.getElementById("typeInput");
const providerInput = document.getElementById("providerInput");
const statusInput = document.getElementById("statusInput");
const providerFilter = document.getElementById("providerFilter");
const ratingFilter = document.getElementById("ratingFilter");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const clearKeyBtn = document.getElementById("clearKeyBtn");
const apiStatus = document.getElementById("apiStatus");
const moodInput = document.getElementById("moodInput");
const availabilityMode = document.getElementById("availabilityMode");
const useSearchToggle = document.getElementById("useSearchToggle");
const recommendBtn = document.getElementById("recommendBtn");
const aiStatus = document.getElementById("aiStatus");
const aiRecommendations = document.getElementById("aiRecommendations");
const debugOutput = document.getElementById("debugOutput");
const copyDebugBtn = document.getElementById("copyDebugBtn");
const clearDebugBtn = document.getElementById("clearDebugBtn");
const appVersionInfoEl = document.getElementById("appVersionInfo");

let debugLines = [];

function renderVersionInfo() {
  if (appVersionInfoEl) {
    appVersionInfoEl.textContent = "Version: " + APP_VERSION;
  }
}

function switchView(viewId) {
  views.forEach((v) => v.classList.toggle("active", v.id === viewId));
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function debugLog(message) {
  const now = new Date().toISOString().slice(11, 23);
  debugLines.push("[" + now + "] " + message);
  if (debugLines.length > 80) debugLines = debugLines.slice(-80);
  debugOutput.textContent = debugLines.join("\n");
  debugOutput.scrollTop = debugOutput.scrollHeight;
}

copyDebugBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(debugOutput.textContent);
    copyDebugBtn.textContent = "Kopiert";
    setTimeout(() => { copyDebugBtn.textContent = "Log kopieren"; }, 1500);
  } catch {
    debugLog("Zwischenablage nicht direkt verfügbar – Text manuell markieren.");
  }
});

clearDebugBtn.addEventListener("click", () => {
  debugLines = [];
  debugOutput.textContent = "Log geleert.";
});

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  watchlistCountEl.textContent = String(items.length);
}

function saveSeenEntries() {
  localStorage.setItem(SEEN_TITLES_STORAGE, JSON.stringify(seenEntries));
  seenCountEl.textContent = String(seenEntries.length);
}

function findSeenIndex(title) {
  const lower = stripMarkdown(title).toLowerCase();
  return seenEntries.findIndex((e) => String(e.title).toLowerCase() === lower);
}

function isTitleMarkedSeen(title) {
  return findSeenIndex(title) !== -1;
}

function addSeenEntry(title, mediaType = null) {
  const clean = stripMarkdown(title);
  if (!clean) return;
  const idx = findSeenIndex(clean);
  const normalizedType = mediaType ? normalizeMediaType(mediaType) : null;
  if (idx === -1) {
    seenEntries.unshift({ title: clean, type: normalizedType });
  } else if (normalizedType && !seenEntries[idx].type) {
    seenEntries[idx].type = normalizedType;
  }
  saveSeenEntries();
}

function removeSeenEntry(title) {
  const clean = stripMarkdown(title);
  if (!clean) return;
  const lower = clean.toLowerCase();
  seenEntries = seenEntries.filter((e) => String(e.title).toLowerCase() !== lower);
  saveSeenEntries();
}

function toggleSeenTitle(title, mediaType = null) {
  const clean = stripMarkdown(title);
  if (!clean) return false;
  if (isTitleMarkedSeen(clean)) {
    removeSeenEntry(clean);
    renderSeenList();
    return false;
  } else {
    addSeenEntry(clean, mediaType);
    renderSeenList();
    return true;
  }
}

function markTitleAsSeen(title, mediaType = null) {
  const clean = stripMarkdown(title);
  if (!clean) return;
  const lower = clean.toLowerCase();
  const existingItem = items.find((entry) => stripMarkdown(entry.title).toLowerCase() === lower);
  const resolvedType = mediaType || existingItem?.type || null;
  addSeenEntry(clean, resolvedType);
  items = items.filter((entry) => stripMarkdown(entry.title).toLowerCase() !== lower);
  saveItems();
  renderList();
  renderSeenList();
}

function createSeenButton(title, mediaType = null, onAfterToggle = null) {
  let isSeen = isTitleMarkedSeen(title);
  const seenBtn = document.createElement("button");
  seenBtn.type = "button";
  seenBtn.className = "seen-btn" + (isSeen ? " active" : "");
  seenBtn.textContent = "✓ Gesehen";
  seenBtn.title = "Als bereits gesehen markieren";
  seenBtn.setAttribute("aria-label", "Als bereits gesehen markieren");
  seenBtn.setAttribute("aria-pressed", String(isSeen));
  seenBtn.addEventListener("click", () => {
    isSeen = toggleSeenTitle(title, mediaType);
    seenBtn.classList.toggle("active", isSeen);
    seenBtn.setAttribute("aria-pressed", String(isSeen));
    if (typeof onAfterToggle === "function") {
      onAfterToggle(isSeen);
    }
  });
  return seenBtn;
}

function saveEnabledProviders() {
  localStorage.setItem(ACTIVE_PROVIDERS_STORAGE, JSON.stringify(enabledProviders));
  syncProviderSelects();
  renderProviderToggles();
}

function syncProviderSelects() {
  const previousInputValue = providerInput.value;
  const previousFilterValue = providerFilter.value;

  const selectableForAdd = enabledProviders.length > 0 ? enabledProviders : PROVIDERS;
  providerInput.innerHTML = selectableForAdd
    .map((p) => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>")
    .join("");
  if (selectableForAdd.includes(previousInputValue)) {
    providerInput.value = previousInputValue;
  }

  providerFilter.innerHTML =
    '<option value="Alle">Alle Anbieter</option>' +
    PROVIDERS.map((p) => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>").join("");
  if (["Alle", ...PROVIDERS].includes(previousFilterValue)) {
    providerFilter.value = previousFilterValue;
  }

  activeProvidersCountEl.textContent = String(enabledProviders.length);
  if (enabledProviders.length === 0) {
    activeProviderSummaryEl.textContent = "Aktive Anbieter: Keine ausgewählt (bitte unter „Anbieter“ wählen).";
  } else if (enabledProviders.length === PROVIDERS.length) {
    activeProviderSummaryEl.textContent = "Aktive Anbieter: Alle (" + PROVIDERS.length + ")";
  } else {
    activeProviderSummaryEl.textContent = "Aktive Anbieter: " + enabledProviders.join(", ");
  }
}

function toggleProvider(provider) {
  if (enabledProviders.includes(provider)) {
    enabledProviders = enabledProviders.filter((p) => p !== provider);
  } else {
    enabledProviders.push(provider);
  }
  saveEnabledProviders();
}

function renderProviderToggles() {
  providerToggleGrid.innerHTML = "";
  PROVIDERS.forEach((provider) => {
    const isEnabled = enabledProviders.includes(provider);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "provider-toggle" + (isEnabled ? " enabled" : "");
    btn.setAttribute("aria-pressed", String(isEnabled));
    btn.innerHTML =
      "<span>" + escapeHtml(provider) + "</span>" +
      '<span class="toggle-state">' + (isEnabled ? "Aktiv" : "Aus") + "</span>";
    btn.addEventListener("click", () => toggleProvider(provider));
    providerToggleGrid.append(btn);
  });
}

selectAllProvidersBtn.addEventListener("click", () => {
  enabledProviders = [...PROVIDERS];
  saveEnabledProviders();
});

selectMediathekenBtn.addEventListener("click", () => {
  enabledProviders = [...MEDIATHEK_FREE_PROVIDERS];
  saveEnabledProviders();
});

clearProvidersBtn.addEventListener("click", () => {
  enabledProviders = [];
  saveEnabledProviders();
});

function getApiKey() {
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
}

function updateApiBadge() {
  const hasKey = Boolean(getApiKey());
  apiStatus.textContent = hasKey ? "Gemini aktiv" : "Demo-Modus";
  apiStatus.classList.toggle("active", hasKey);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function stripMarkdown(str) {
  return String(str).replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function normalizeProvider(raw) {
  if (!raw) return "Sonstiges";
  const match = PROVIDERS.find((p) => p.toLowerCase() === String(raw).trim().toLowerCase());
  return match || "Sonstiges";
}

function normalizeMediaType(raw, rec = {}) {
  const candidate = String(raw || rec.category || rec.format || "").trim().toLowerCase();
  if (/(serie|series|staffel|miniserie|show|tv-serie)/i.test(candidate)) {
    return "Serie";
  }
  if (/(film|movie|spielfilm|kinofilm|doku|dokumentation)/i.test(candidate)) {
    return candidate.includes("doku") ? "Doku" : "Film";
  }
  const runtimeStr = String(rec.runtime || "").toLowerCase();
  if (/staffel|folgen|episoden/i.test(runtimeStr)) {
    return "Serie";
  }
  return "Film";
}

function getRatingIcon(rating) {
  if (rating === "Finde ich super") return "👍👍";
  if (rating === "Gefällt mir") return "👍";
  if (rating === "Nicht gefällt mir") return "👎";
  return "";
}

function addToWatchlist(title, provider, rating = null, mediaType = null) {
  const cleanTitle = stripMarkdown(title);
  if (!cleanTitle) return;
  items.unshift({
    id: crypto.randomUUID(),
    title: cleanTitle,
    type: mediaType ? normalizeMediaType(mediaType) : null,
    provider: normalizeProvider(provider),
    rating: RATINGS.includes(rating) ? rating : null
  });
  saveItems();
  renderList();
}

function setItemRating(item, nextRating) {
  item.rating = item.rating === nextRating ? null : nextRating;
  saveItems();
  renderList();
}

function createRatingControls(currentRating, onSelect) {
  const group = document.createElement("div");
  group.className = "rating-group";

  const configs = [
    { value: "Nicht gefällt mir", icon: "👎", label: "Nicht gefällt mir", activeClass: "selected-dislike" },
    { value: "Gefällt mir", icon: "👍", label: "Gefällt mir", activeClass: "selected-like" },
    { value: "Finde ich super", icon: "👍👍", label: "Finde ich super", activeClass: "selected-super" }
  ];

  configs.forEach((cfg) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rate-btn";
    if (currentRating === cfg.value) {
      btn.classList.add(cfg.activeClass);
    }
    btn.textContent = cfg.icon;
    btn.title = cfg.label;
    btn.setAttribute("aria-label", cfg.label);
    btn.addEventListener("click", () => onSelect(cfg.value));
    group.append(btn);
  });

  return group;
}

function renderSeenList() {
  seenCountEl.textContent = String(seenEntries.length);
  seenContainer.innerHTML = "";
  if (seenEntries.length === 0) {
    seenContainer.innerHTML = '<div class="meta">Noch keine Titel als gesehen markiert.</div>';
    return;
  }

  seenEntries.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "item";

    const typeBadge = entry.type
      ? '<span class="type-pill">' + escapeHtml(entry.type) + "</span>"
      : "";

    const info = document.createElement("div");
    info.innerHTML = "<strong>" + escapeHtml(entry.title) + "</strong>" + typeBadge;

    const actions = document.createElement("div");
    actions.className = "actions";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "unseen-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Markierung entfernen";
    removeBtn.setAttribute("aria-label", "Markierung entfernen");
    removeBtn.addEventListener("click", () => {
      removeSeenEntry(entry.title);
      renderSeenList();
      renderList();
    });

    actions.append(removeBtn);
    div.append(info, actions);
    seenContainer.append(div);
  });
}

function renderList() {
  watchlistCountEl.textContent = String(items.length);
  const selectedProvider = providerFilter.value;
  const selectedRating = ratingFilter.value;

  const filtered = items.filter((item) => {
    const providerMatch = selectedProvider === "Alle" || item.provider === selectedProvider;
    let ratingMatch = true;
    if (selectedRating === "Ohne Bewertung") {
      ratingMatch = !item.rating;
    } else if (selectedRating !== "Alle") {
      ratingMatch = item.rating === selectedRating;
    }
    return providerMatch && ratingMatch;
  });

  watchlistContainer.innerHTML = "";
  if (filtered.length === 0) {
    watchlistContainer.innerHTML = '<div class="meta">Keine Einträge für den gewählten Filter vorhanden.</div>';
    return;
  }

  filtered.forEach((item) => {
    const providerName = PROVIDERS.includes(item.provider) ? item.provider : "Sonstiges";
    const currentRating = RATINGS.includes(item.rating) ? item.rating : null;
    const typeBadge = item.type
      ? '<span class="type-pill">' + escapeHtml(item.type) + "</span>"
      : "";

    const div = document.createElement("div");
    div.className = "item";

    const info = document.createElement("div");
    const ratingBadge = currentRating
      ? '<span class="rating-pill">' + escapeHtml(getRatingIcon(currentRating) + " " + currentRating) + "</span>"
      : "";
    info.innerHTML =
      "<div>" +
        "<strong>" + escapeHtml(item.title) + "</strong>" +
        typeBadge +
        '<span class="provider-pill">' + escapeHtml(providerName) + "</span>" +
        ratingBadge +
      "</div>";

    const ratingControls = createRatingControls(currentRating, (nextRating) => {
      setItemRating(item, nextRating);
    });

    const actions = document.createElement("div");
    actions.className = "actions";

    const seenBtn = document.createElement("button");
    seenBtn.type = "button";
    seenBtn.className = "seen-btn";
    seenBtn.textContent = "✓ Gesehen";
    seenBtn.title = "Als gesehen markieren und aus der Merkliste entfernen";
    seenBtn.setAttribute("aria-label", "Als gesehen markieren und aus der Merkliste entfernen");
    seenBtn.addEventListener("click", () => {
      markTitleAsSeen(item.title, item.type);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "unseen-btn";
    delBtn.textContent = "✕";
    delBtn.title = "Aus Merkliste löschen";
    delBtn.setAttribute("aria-label", "Aus Merkliste löschen");
    delBtn.addEventListener("click", () => {
      items = items.filter((entry) => entry.id !== item.id);
      saveItems();
      renderList();
    });

    actions.append(ratingControls, seenBtn, delBtn);
    div.append(info, actions);
    watchlistContainer.append(div);
  });
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const chosenType = typeInput ? normalizeMediaType(typeInput.value) : "Film";
  if (statusInput && statusInput.value === "Gesehen") {
    addSeenEntry(title, chosenType);
    renderSeenList();
    titleInput.value = "";
    titleInput.focus();
    return;
  }
  items.unshift({
    id: crypto.randomUUID(),
    title,
    type: chosenType,
    provider: providerInput.value,
    rating: null
  });
  saveItems();
  renderList();
  titleInput.value = "";
  titleInput.focus();
});

providerFilter.addEventListener("change", renderList);
ratingFilter.addEventListener("change", renderList);

saveKeyBtn.addEventListener("click", () => {
  const val = apiKeyInput.value.trim();
  if (!val) return;
  localStorage.setItem(API_KEY_STORAGE, val);
  apiKeyInput.value = "";
  updateApiBadge();
  aiStatus.textContent = "API-Key lokal gespeichert. Du kannst jetzt eine Empfehlung anfordern.";
  debugLog("API-Key gespeichert (Länge: " + val.length + " Zeichen).");
});

clearKeyBtn.addEventListener("click", () => {
  localStorage.removeItem(API_KEY_STORAGE);
  apiKeyInput.value = "";
  updateApiBadge();
  aiStatus.textContent = "Gespeicherter API-Key entfernt.";
  aiRecommendations.innerHTML = "";
  debugLog("API-Key entfernt.");
});

recommendBtn.addEventListener("click", async () => {
  const key = getApiKey();
  const mood = moodInput.value.trim() || "abwechslungsreich";
  const availMode = availabilityMode.value;
  const searchEnabled = Boolean(useSearchToggle.checked);
  const titles = items
    .map((i) => i.title + (i.type ? " (" + i.type + ")" : "") + " [" + (i.provider || "Sonstiges") + (i.rating ? ", Bewertung: " + i.rating : "") + "]")
    .join(", ");
  const seenListText = seenEntries.length > 0
    ? seenEntries.map((e) => e.title + (e.type ? " (" + e.type + ")" : "")).join(", ")
    : "keine";

  await fetchGeminiRecommendations({
    apiKey: key,
    mood,
    availMode,
    searchEnabled,
    enabledProviders,
    providers: PROVIDERS,
    titles,
    seenListText,
    onStatus: (text) => {
      aiStatus.textContent = text;
    },
    onRecommendations: (recs) => {
      renderRecommendations(aiRecommendations, recs);
    },
    onLog: debugLog
  });
});

renderVersionInfo();
seenCountEl.textContent = String(seenEntries.length);
updateApiBadge();
syncProviderSelects();
renderProviderToggles();
renderList();
renderSeenList();
debugLog("Watchlist-Kurator (" + APP_VERSION + ") initialisiert.");
