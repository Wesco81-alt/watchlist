const STORAGE_KEY = "watchlist_kurator_items_v4";
const SEEN_TITLES_STORAGE = "watchlist_kurator_seen_titles_v2";
const SEEN_TITLES_LEGACY_STORAGE = "watchlist_kurator_seen_titles_v1";
const API_KEY_STORAGE = "watchlist_kurator_gemini_key_v1";
const ACTIVE_PROVIDERS_STORAGE = "watchlist_kurator_active_providers_v1";
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
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

let debugLines = [];

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

function buildAvailabilityCheckUrl(title, provider) {
  const queryParts = [stripMarkdown(title)];
  if (provider && provider !== "Sonstiges") {
    if (provider === "Tresat") {
      queryParts.push("3sat Mediathek");
    } else if (["ARD", "ZDF", "Joyn", "Netzkino"].includes(provider)) {
      queryParts.push(provider + " Mediathek");
    } else {
      queryParts.push(provider);
    }
  }
  return "https://www.google.com/search?q=" + encodeURIComponent(queryParts.join(" "));
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

function renderRecommendations(recs) {
  aiRecommendations.innerHTML = "";
  if (!Array.isArray(recs) || recs.length === 0) return;

  const grouped = new Map();
  for (const rec of recs) {
    const clusterName = stripMarkdown(rec.cluster || "Soghafte Wendungen");
    const clusterDesc = stripMarkdown(
      rec.clusterDesc || rec.clusterDescription || rec.clusterSummary || ""
    );
    if (!grouped.has(clusterName)) {
      grouped.set(clusterName, { desc: clusterDesc, items: [] });
    } else if (!grouped.get(clusterName).desc && clusterDesc) {
      grouped.get(clusterName).desc = clusterDesc;
    }
    grouped.get(clusterName).items.push(rec);
  }

  for (const [clusterName, groupData] of grouped.entries()) {
    const clusterBlock = document.createElement("div");
    clusterBlock.className = "cluster-block";

    const clusterHeader = document.createElement("div");
    clusterHeader.className = "cluster-header";

    const heading = document.createElement("div");
    heading.className = "cluster-title";
    heading.textContent = clusterName;
    clusterHeader.append(heading);

    if (groupData.desc) {
      const descEl = document.createElement("div");
      descEl.className = "cluster-desc";
      descEl.textContent = groupData.desc;
      clusterHeader.append(descEl);
    }

    clusterBlock.append(clusterHeader);

    for (const rec of groupData.items) {
      const title = stripMarkdown(rec.title || "Unbekannter Titel");
      const mediaType = normalizeMediaType(rec.type, rec);
      const year = rec.year ? " (" + escapeHtml(rec.year) + ")" : "";
      const provider = normalizeProvider(rec.provider);
      const availability = stripMarkdown(rec.availability || "Verfügbarkeit prüfen");
      const runtime = rec.runtime ? stripMarkdown(rec.runtime) : "";
      const avHint = stripMarkdown(rec.avHint || "");
      const reason = stripMarkdown(rec.reason || "");
      let chosenRating = null;

      const card = document.createElement("div");
      card.className = "rec-card";

      const head = document.createElement("div");
      head.className = "rec-head";

      const titleWrap = document.createElement("div");
      titleWrap.innerHTML =
        "<strong>" + escapeHtml(title) + "</strong>" + year +
        '<span class="type-pill">' + escapeHtml(mediaType) + "</span>" +
        '<span class="provider-pill">' + escapeHtml(provider) + "</span>" +
        '<span class="avail-pill">' + escapeHtml(availability) + "</span>";

      const rightActions = document.createElement("div");
      rightActions.className = "actions";

      const checkLink = document.createElement("a");
      checkLink.className = "link-btn";
      checkLink.href = buildAvailabilityCheckUrl(title, provider);
      checkLink.target = "_blank";
      checkLink.rel = "noopener noreferrer";
      checkLink.textContent = "Verfügbarkeit prüfen";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "secondary";
      addBtn.textContent = "+ Merkliste";
      addBtn.addEventListener("click", () => {
        addToWatchlist(title, provider, chosenRating, mediaType);
        addBtn.textContent = "Gespeichert";
        addBtn.className = "success";
        addBtn.disabled = true;
      });

      rightActions.append(checkLink, addBtn);
      head.append(titleWrap, rightActions);

      const metaParts = [];
      if (runtime) metaParts.push("Laufzeit: " + runtime);
      if (avHint) metaParts.push("Bild/Ton (ca.): " + avHint);

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = metaParts.join(" · ");

      const body = document.createElement("div");
      body.textContent = reason;

      const feedbackRow = document.createElement("div");
      feedbackRow.className = "rec-feedback-row";

      const seenBtn = createSeenButton(title, mediaType);

      function mountRatingControls() {
        const group = createRatingControls(chosenRating, (val) => {
          chosenRating = chosenRating === val ? null : val;
          mountRatingControls();
        });
        const existing = feedbackRow.querySelector(".rating-group");
        if (existing) {
          existing.replaceWith(group);
        } else {
          feedbackRow.prepend(group);
        }
      }

      mountRatingControls();
      feedbackRow.append(seenBtn);

      card.append(head);
      if (metaParts.length > 0) card.append(meta);
      if (reason) card.append(body);
      card.append(feedbackRow);
      clusterBlock.append(card);
    }

    aiRecommendations.append(clusterBlock);
  }
}

function extractJsonArrayText(rawText) {
  let cleaned = String(rawText)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }
  return cleaned;
}

function parseRecommendationsJson(rawText) {
  const cleaned = extractJsonArrayText(rawText);
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.recommendations)) return parsed.recommendations;
  return null;
}

function parseApiResponseText(rawBody, httpStatus) {
  const trimmed = String(rawBody || "").trim();
  if (!trimmed) {
    throw new Error("Leere Antwort (HTTP " + httpStatus + ")");
  }
  if (trimmed.startsWith("<")) {
    const snippet = trimmed.replace(/\s+/g, " ").slice(0, 180);
    throw new Error("Server lieferte HTML statt JSON (HTTP " + httpStatus + "): " + snippet);
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const snippet = trimmed.replace(/\s+/g, " ").slice(0, 180);
    throw new Error("Ungültiges JSON (HTTP " + httpStatus + "): " + snippet);
  }
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
    removeBtn.textContent = "↩";
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
    delBtn.className = "danger";
    delBtn.textContent = "Löschen";
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
  const providerPool = enabledProviders.length > 0 ? enabledProviders : PROVIDERS;
  const titles = items
    .map((i) => i.title + (i.type ? " (" + i.type + ")" : "") + " [" + (i.provider || "Sonstiges") + (i.rating ? ", Bewertung: " + i.rating : "") + "]")
    .join(", ");
  const seenListText = seenEntries.length > 0
    ? seenEntries.map((e) => e.title + (e.type ? " (" + e.type + ")" : "")).join(", ")
    : "keine";

  debugLog('Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") + ' | Modus: "' + availMode + '" | Aktive Anbieter: [' + providerPool.join(", ") + '] | Stimmung: "' + mood + '"');

  if (!key) {
    aiStatus.textContent = "Demo-Hinweis: Für die Merkliste (" + (titles || "leer") + ") wäre ein guter nächster Titel im Bereich „" + mood + "“ ein passender Film oder eine Serie mit starker Atmosphäre. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern.";
    debugLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  aiStatus.textContent = searchEnabled
    ? "Suche im Web nach aktueller Verfügbarkeit & erstelle Vorschläge..."
    : "Frage Gemini an...";
  aiRecommendations.innerHTML = "";

  const providerHint = enabledProviders.length > 0
    ? "Nutze ausschließlich Anbieter aus dieser aktiven Auswahl: " + enabledProviders.join(", ") + "."
    : "Nutze passende Anbieter aus: " + PROVIDERS.join(", ") + ".";

  const searchInstruction = searchEnabled
    ? "Nutze die Google-Suche, um möglichst aktuell zu prüfen, ob vorgeschlagene Titel beim jeweiligen Anbieter bzw. in Mediatheken wie Netzkino, ARD, ZDF, 3sat oder Joyn tatsächlich verfügbar sind. Wenn etwas unklar ist, kennzeichne availability ehrlich als 'Verfügbarkeit prüfen'."
    : "Gib eine realistische Einschätzung zur Verfügbarkeit an und markiere unsichere Fälle ehrlich mit 'Verfügbarkeit prüfen'.";

  const promptText = [
    "Du bist ein hilfreicher Watchlist-Kurator für Deutschland.",
    "Aktuelle Merkliste (inkl. Bewertungen): " + (titles || "keine Einträge") + ".",
    "Bereits als gesehen markierte Titel (nicht erneut vorschlagen): " + seenListText + ".",
    "Bevorzuge Stil und Tonfall von Titeln mit 'Finde ich super', beziehe 'Gefällt mir' positiv ein und meide Ähnliches zu 'Nicht gefällt mir'.",
    "Wunsch/Stimmung: " + mood + ".",
    "Verfügbarkeits-Vorgabe: " + availMode + ".",
    providerHint,
    searchInstruction,
    "Wichtig für 'cluster' und 'clusterDesc': Formuliere 'cluster' als pointierte, prägnante Überschrift (max. 3 bis 5 Wörter, z. B. 'Kalte Rätsel im Nebel' oder 'Gnadenlose Doppelböden') nach Inhalt, Atmosphäre oder Dramaturgie – niemals bloß Anbieternamen, Mediatheken oder Verfügbarkeits-Begriffe. Formuliere 'clusterDesc' als scharfen, einprägsamen Einzeiler (max. 10–14 Wörter), der den gemeinsamen Kern der Titel auf den Punkt bringt.",
    "Gib bei avHint eine kurze, unverbindliche Einschätzung zu Bild/Ton (z. B. 'HD / Stereo' oder 'UHD / 5.1 möglich').",
    "Antworte auf Deutsch mit 3 bis 4 konkreten Empfehlungen als reines JSON-Array (ohne einleitenden oder abschließenden Text) mit diesen Feldern:",
    '[{"cluster":"Pointierte Überschrift (3-5 Wörter)","clusterDesc":"Pointierter Einzeiler zum gemeinsamen Kern.","title":"Titel","type":"Film oder Serie","year":"Jahr","runtime":"z.B. 113 Min. oder 2 Staffeln","provider":"Einer aus: Sky, Netflix, ARD, ZDF, Tresat, Joyn, Netzkino, Prime Video, HBO Max, Apple TV, Rakuten TV, Sonstiges","availability":"Kurzstatus z.B. Per Suche plausibel / Mediathek / Verfügbarkeit prüfen","avHint":"z.B. HD/5.1 oder UHD/Atmos möglich","reason":"1 kurzer Satz Begründung inkl. Hinweis zur Verfügbarkeit"}]'
  ].join(" ");

  const apiHost = "generativelanguage.googleapis.com";
  const attemptedModels = [];
  let lastError = null;

  for (let idx = 0; idx < GEMINI_MODELS.length; idx++) {
    const model = GEMINI_MODELS[idx];
    attemptedModels.push(model);
    const endpoint = "https://" + apiHost + "/v1beta/models/" + model + ":generateContent";
    const requestUrl = endpoint + "?key=" + encodeURIComponent(key);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const requestBody = {
      contents: [{
        parts: [{ text: promptText }]
      }]
    };
    if (searchEnabled) {
      requestBody.tools = [{ google_search: {} }];
    } else {
      requestBody.generationConfig = {
        thinkingConfig: { thinkingBudget: 0 }
      };
    }

    debugLog("Versuch " + (idx + 1) + "/" + GEMINI_MODELS.length + ": POST " + endpoint + " | Web-Suche: " + (searchEnabled ? "ja" : "nein"));

    try {
      const res = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      });
      const rawBody = await res.text();
      debugLog("Antwort von " + model + ": HTTP " + res.status + ", Länge: " + rawBody.length + " Zeichen");
      const data = parseApiResponseText(rawBody, res.status);
      if (!res.ok) {
        const apiMsg = data?.error?.message || ("HTTP " + res.status);
        throw new Error(apiMsg + " [Status " + res.status + "]");
      }
      const candidate = data?.candidates?.[0];
      const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];
      if (searchEnabled) {
        if (searchQueries.length > 0) {
          debugLog("Google-Suche genutzt: " + searchQueries.join(" | "));
        } else {
          debugLog("Hinweis: Keine webSearchQueries in groundingMetadata gemeldet.");
        }
      }
      const parts = candidate?.content?.parts || [];
      const rawText = parts.map((p) => p.text || "").join("\n").trim();
      debugLog("Kandidatentext erhalten (" + rawText.length + " Zeichen).");
      try {
        const parsedRecs = parseRecommendationsJson(rawText);
        if (parsedRecs) {
          aiStatus.textContent = "Vorschläge erstellt (Modell: " + model + (searchEnabled ? ", mit Web-Suche" : "") + "):";
          renderRecommendations(parsedRecs);
          debugLog("JSON erfolgreich geparst (" + parsedRecs.length + " Einträge).");
        } else {
          aiStatus.textContent = stripMarkdown(rawText) || "Keine Antwort erhalten.";
          debugLog("Kein Array in JSON gefunden -> Textausgabe.");
        }
      } catch {
        aiStatus.textContent = stripMarkdown(rawText) || "Keine Antwort erhalten.";
        debugLog("Antwort war kein JSON -> Textausgabe.");
      }
      clearTimeout(timeoutId);
      return;
    } catch (err) {
      lastError = err;
      debugLog("Fehler bei " + model + ": " + err.name + ": " + err.message);

      const msg = String(err.message || "");
      const isFallbackWorthwhile =
        err.name === "AbortError" ||
        /high demand|overloaded|503|500|429|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|exceeded|rate|limit/i.test(msg);

      if (!isFallbackWorthwhile) {
        clearTimeout(timeoutId);
        aiStatus.textContent = "Fehler bei der Gemini-Anfrage (" + model + "): " + msg;
        return;
      }

      if (idx < GEMINI_MODELS.length - 1) {
        debugLog("Fallback aktiv -> wechsle von " + model + " auf " + GEMINI_MODELS[idx + 1]);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") {
    aiStatus.textContent = "Zeitüberschreitung nach 30 Sekunden (getestet: " + attemptedModels.join(" -> ") + ").";
  } else {
    aiStatus.textContent =
      "Fehler bei allen getesteten Modellen (" + attemptedModels.join(" -> ") + "): " +
      (lastError?.message || "Kontingent erschöpft oder aktuell ausgelastet.");
  }
});

seenCountEl.textContent = String(seenEntries.length);
updateApiBadge();
syncProviderSelects();
renderProviderToggles();
renderList();
renderSeenList();
debugLog("Watchlist-Kurator initialisiert.");
