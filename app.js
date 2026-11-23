const APP_VERSION = "lokaler Stand (dev)";
const STORAGE_KEY = "watchlist_kurator_items_v4";
const SEEN_TITLES_STORAGE = "watchlist_kurator_seen_titles_v2";
const SEEN_TITLES_LEGACY_STORAGE = "watchlist_kurator_seen_titles_v1";
const SEEN_RATINGS_STORAGE = "watchlist_kurator_seen_ratings_v1";
const API_KEY_STORAGE = "watchlist_kurator_gemini_key_v1";
const ACTIVE_PROVIDERS_STORAGE = "watchlist_kurator_active_providers_v1";
const DEFAULT_SEEN_MIN_SECONDS = 300;
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
const seenRatingFilter = document.getElementById("seenRatingFilter");
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
const seenImportFileInput = document.getElementById("seenImportFileInput");
const seenMinSecondsInput = document.getElementById("seenMinSecondsInput");
const seenImportTextarea = document.getElementById("seenImportTextarea");
const replaceSeenToggle = document.getElementById("replaceSeenToggle");
const importSeenBtn = document.getElementById("importSeenBtn");
const clearSeenImportInputBtn = document.getElementById("clearSeenImportInputBtn");
const seenImportStatus = document.getElementById("seenImportStatus");
const ratingsImportFileInput = document.getElementById("ratingsImportFileInput");
const ratingsImportTextarea = document.getElementById("ratingsImportTextarea");
const addRatedToSeenToggle = document.getElementById("addRatedToSeenToggle");
const importRatingsBtn = document.getElementById("importRatingsBtn");
const clearRatingsImportInputBtn = document.getElementById("clearRatingsImportInputBtn");
const ratingsImportStatus = document.getElementById("ratingsImportStatus");
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
  if (debugOutput) {
    debugOutput.textContent = debugLines.join("\n");
    debugOutput.scrollTop = debugOutput.scrollHeight;
  }
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
  if (watchlistCountEl) {
    watchlistCountEl.textContent = String(items.length);
  }
}

function saveSeenEntries() {
  localStorage.setItem(SEEN_TITLES_STORAGE, JSON.stringify(seenEntries));
  if (seenCountEl) {
    seenCountEl.textContent = String(seenEntries.length);
  }
}

function saveSeenRatings() {
  localStorage.setItem(SEEN_RATINGS_STORAGE, JSON.stringify(seenRatings));
}

function loadSeenRatings() {
  const raw = localStorage.getItem(SEEN_RATINGS_STORAGE);
  const map = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([k, v]) => {
          const key = stripMarkdown(k).toLowerCase();
          if (key && RATINGS.includes(v)) {
            map[key] = v;
          }
        });
      }
    } catch {
      // ignore
    }
  }
  if (Array.isArray(items)) {
    items.forEach((it) => {
      const key = stripMarkdown(it.title || "").toLowerCase();
      if (key && RATINGS.includes(it.rating) && !map[key]) {
        map[key] = it.rating;
      }
    });
  }
  return map;
}

function getTitleRating(title) {
  const key = stripMarkdown(title).toLowerCase();
  if (key && RATINGS.includes(seenRatings[key])) {
    return seenRatings[key];
  }
  const watchMatch = items.find((i) => stripMarkdown(i.title || "").toLowerCase() === key);
  if (watchMatch && RATINGS.includes(watchMatch.rating)) {
    return watchMatch.rating;
  }
  return null;
}

function setTitleRating(title, nextRating) {
  const clean = stripMarkdown(title);
  const key = clean.toLowerCase();
  if (!key) return;

  const validRating = RATINGS.includes(nextRating) ? nextRating : null;
  if (validRating) {
    seenRatings[key] = validRating;
  } else {
    delete seenRatings[key];
  }
  saveSeenRatings();

  items.forEach((it) => {
    if (stripMarkdown(it.title || "").toLowerCase() === key) {
      it.rating = validRating;
    }
  });
  saveItems();
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
  if (existingItem && RATINGS.includes(existingItem.rating) && !seenRatings[lower]) {
    seenRatings[lower] = existingItem.rating;
    saveSeenRatings();
  }
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

  if (activeProvidersCountEl) {
    activeProvidersCountEl.textContent = String(enabledProviders.length);
  }
  if (activeProviderSummaryEl) {
    if (enabledProviders.length === 0) {
      activeProviderSummaryEl.textContent = "Aktive Anbieter: Keine ausgewählt (bitte unter „Anbieter“ wählen).";
    } else if (enabledProviders.length === PROVIDERS.length) {
      activeProviderSummaryEl.textContent = "Aktive Anbieter: Alle (" + PROVIDERS.length + ")";
    } else {
      activeProviderSummaryEl.textContent = "Aktive Anbieter: " + enabledProviders.join(", ");
    }
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
  if (!providerToggleGrid) return;
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

function mapThumbsValueToRating(val) {
  const num = Number(String(val ?? "").trim());
  if (num === 1) return "Nicht gefällt mir";
  if (num === 2) return "Gefällt mir";
  if (num === 3) return "Finde ich super";
  return null;
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
  const resolved = item.rating === nextRating ? null : nextRating;
  item.rating = resolved;
  const key = stripMarkdown(item.title || "").toLowerCase();
  if (key) {
    if (resolved) {
      seenRatings[key] = resolved;
    } else {
      delete seenRatings[key];
    }
    saveSeenRatings();
  }
  saveItems();
  renderList();
  renderSeenList();
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
  if (seenCountEl) {
    seenCountEl.textContent = String(seenEntries.length);
  }
  const selectedRating = seenRatingFilter ? seenRatingFilter.value : "Alle";

  const filtered = seenEntries.filter((entry) => {
    const rating = getTitleRating(entry.title);
    if (selectedRating === "Ohne Bewertung") return !rating;
    if (selectedRating !== "Alle") return rating === selectedRating;
    return true;
  });

  seenContainer.innerHTML = "";
  if (filtered.length === 0) {
    seenContainer.innerHTML = '<div class="meta">Keine gesehenen Titel für den gewählten Filter vorhanden.</div>';
    return;
  }

  filtered.forEach((entry) => {
    const currentRating = getTitleRating(entry.title);
    const div = document.createElement("div");
    div.className = "item";

    const typeBadge = entry.type
      ? '<span class="type-pill">' + escapeHtml(entry.type) + "</span>"
      : "";
    const ratingBadge = currentRating
      ? '<span class="rating-pill">' + escapeHtml(getRatingIcon(currentRating) + " " + currentRating) + "</span>"
      : "";

    const info = document.createElement("div");
    info.innerHTML =
      "<div>" +
        "<strong>" + escapeHtml(entry.title) + "</strong>" +
        typeBadge +
        ratingBadge +
      "</div>";

    const ratingControls = createRatingControls(currentRating, (clickedRating) => {
      const next = currentRating === clickedRating ? null : clickedRating;
      setTitleRating(entry.title, next);
      renderSeenList();
      renderList();
    });

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

    actions.append(ratingControls, removeBtn);
    div.append(info, actions);
    seenContainer.append(div);
  });
}

function renderList() {
  if (watchlistCountEl) {
    watchlistCountEl.textContent = String(items.length);
  }
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

function parseDurationToSeconds(durationStr) {
  const parts = String(durationStr || "").trim().split(":");
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    if ([h, m, s].every(Number.isFinite)) {
      return h * 3600 + m * 60 + s;
    }
  }
  return 0;
}

function parseCsvRows(rawText) {
  const cleanText = rawText.replace(/^\uFEFF/, "");
  const firstLine = cleanText.split(/\r?\n/)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentField);
      currentField = "";
    } else if (ch === "\r" && next === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      i++;
    } else if (ch === "\n" || ch === "\r") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell).trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] !== undefined ? r[idx] : "";
      });
      return obj;
    });
}

function mapNetflixViewingRow(row, minSeconds) {
  const supp = String(row["Supplemental Video Type"] || "").trim();
  if (supp && supp.toUpperCase() !== "NAN") {
    return null;
  }

  const seconds = parseDurationToSeconds(row["Duration"]);
  if (seconds < minSeconds) {
    return null;
  }

  const rawTitle = stripMarkdown(String(row["Title"] || "").trim());
  if (!rawTitle) {
    return null;
  }

  if (/^(trailer|teaser|clip\b)/i.test(rawTitle)) {
    return null;
  }

  const seriesMatch = rawTitle.match(
    /^(.+?):\s*(?:Staffel\s+\d+|Miniserie|Season\s+\d+|Limited Series|Ausgabe\s+\d+|\d+\s*:)/i
  );
  if (seriesMatch) {
    return { title: seriesMatch[1].trim(), type: "Serie" };
  }

  if (/\((?:Folge|Episode)\s+\d+\)\s*$/i.test(rawTitle) && rawTitle.includes(":")) {
    return { title: rawTitle.split(":", 1)[0].trim(), type: "Serie" };
  }

  return { title: rawTitle, type: "Film" };
}

function parseNetflixCsvToEntries(rawText, minSeconds) {
  const records = parseCsvRows(rawText);
  if (records.length === 0 || !("Title" in records[0])) {
    throw new Error("CSV enthält keine gültige 'Title'-Spalte (ViewingActivity.csv erwartet).");
  }

  const deduped = new Map();
  for (const row of records) {
    const mapped = mapNetflixViewingRow(row, minSeconds);
    if (!mapped) continue;
    const key = mapped.title.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, { title: mapped.title, type: mapped.type });
    } else if (mapped.type === "Serie") {
      deduped.get(key).type = "Serie";
    }
  }
  return Array.from(deduped.values());
}

function parseSeenImportPayload(rawText, minSeconds) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.seenEntries)
        ? parsed.seenEntries
        : null;

    if (!list) {
      throw new Error("JSON muss ein Array aus { title, type } oder Strings sein.");
    }

    return list
      .map((entry) => {
        if (typeof entry === "string") {
          const title = stripMarkdown(entry);
          return title ? { title, type: null } : null;
        }
        if (entry && typeof entry === "object" && entry.title) {
          const title = stripMarkdown(entry.title);
          return title ? { title, type: entry.type ? normalizeMediaType(entry.type) : null } : null;
        }
        return null;
      })
      .filter(Boolean);
  }

  return parseNetflixCsvToEntries(trimmed, minSeconds);
}

function parseNetflixRatingsPayload(rawText) {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.ratings)
        ? parsed.ratings
        : null;
    if (!list) {
      throw new Error("JSON muss ein Array aus { title, rating } sein.");
    }
    const map = new Map();
    list.forEach((entry) => {
      const title = stripMarkdown(entry?.title || entry?.["Title Name"] || "");
      const rating = RATINGS.includes(entry?.rating)
        ? entry.rating
        : mapThumbsValueToRating(entry?.thumbsValue ?? entry?.["Thumbs Value"]);
      if (title && rating) {
        map.set(title.toLowerCase(), { title, rating });
      }
    });
    return Array.from(map.values());
  }

  const records = parseCsvRows(trimmed);
  if (records.length === 0 || !("Title Name" in records[0])) {
    throw new Error("CSV enthält keine gültige 'Title Name'-Spalte (Ratings.csv erwartet).");
  }

  // Sort by Event Utc Ts ascending so later ratings overwrite earlier ones
  const sortable = records.map((r, idx) => {
    const tsRaw = String(r["Event Utc Ts"] || "").trim();
    const tsMs = tsRaw ? Date.parse(tsRaw.replace(" ", "T") + (tsRaw.endsWith("Z") ? "" : "Z")) : NaN;
    return { row: r, idx, tsMs: Number.isFinite(tsMs) ? tsMs : idx };
  });
  sortable.sort((a, b) => a.tsMs - b.tsMs || a.idx - b.idx);

  const byTitle = new Map();
  for (const item of sortable) {
    const r = item.row;
    const title = stripMarkdown(String(r["Title Name"] || "").trim());
    if (!title) continue;
    const rating = mapThumbsValueToRating(r["Thumbs Value"]);
    if (!rating) continue;
    byTitle.set(title.toLowerCase(), { title, rating });
  }
  return Array.from(byTitle.values());
}

if (seenImportFileInput) {
  seenImportFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (seenImportTextarea) seenImportTextarea.value = text;
      if (seenImportStatus) {
        seenImportStatus.textContent = `Datei „${file.name}“ geladen. Jetzt auf „Gesehen-Liste importieren“ klicken.`;
      }
      debugLog(`Gesehen-Importdatei geladen: ${file.name} (${file.size} Bytes).`);
    } catch (err) {
      const msg = "Fehler beim Lesen der Datei: " + (err?.message || String(err));
      if (seenImportStatus) seenImportStatus.textContent = msg;
      debugLog(msg);
    }
  });
}

if (importSeenBtn) {
  importSeenBtn.addEventListener("click", () => {
    const rawText = (seenImportTextarea?.value || "").trim();
    if (!rawText) {
      if (seenImportStatus) seenImportStatus.textContent = "Bitte zuerst ViewingActivity.csv / JSON einfügen oder eine Datei wählen.";
      return;
    }

    const minSecondsRaw = Number(seenMinSecondsInput?.value ?? DEFAULT_SEEN_MIN_SECONDS);
    const minSeconds = Number.isFinite(minSecondsRaw) && minSecondsRaw >= 0 ? minSecondsRaw : DEFAULT_SEEN_MIN_SECONDS;

    try {
      const incoming = parseSeenImportPayload(rawText, minSeconds);
      if (incoming.length === 0) {
        if (seenImportStatus) seenImportStatus.textContent = "Keine passenden Titel nach Filterung gefunden.";
        return;
      }

      if (replaceSeenToggle?.checked) {
        seenEntries = [];
        saveSeenEntries();
      }

      let addedCount = 0;
      let updatedCount = 0;

      incoming.forEach((entry) => {
        const idx = findSeenIndex(entry.title);
        if (idx === -1) {
          addSeenEntry(entry.title, entry.type);
          addedCount += 1;
        } else if (entry.type && !seenEntries[idx].type) {
          seenEntries[idx].type = entry.type;
          updatedCount += 1;
        }
      });

      saveSeenEntries();
      renderSeenList();

      const summary = `Import abgeschlossen (ab ${minSeconds}s): ${addedCount} neu hinzugefügt, ${updatedCount} Typ ergänzt (Gesamt: ${seenEntries.length}).`;
      if (seenImportStatus) seenImportStatus.textContent = summary;
      debugLog(summary);
    } catch (err) {
      const msg = "Import fehlgeschlagen: " + (err?.message || String(err));
      if (seenImportStatus) seenImportStatus.textContent = msg;
      debugLog(msg);
    }
  });
}

if (clearSeenImportInputBtn) {
  clearSeenImportInputBtn.addEventListener("click", () => {
    if (seenImportTextarea) seenImportTextarea.value = "";
    if (seenImportFileInput) seenImportFileInput.value = "";
    if (seenImportStatus) seenImportStatus.textContent = "Eingabe geleert.";
  });
}

if (ratingsImportFileInput) {
  ratingsImportFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (ratingsImportTextarea) ratingsImportTextarea.value = text;
      if (ratingsImportStatus) {
        ratingsImportStatus.textContent = `Datei „${file.name}“ geladen. Jetzt auf „Bewertungen importieren“ klicken.`;
      }
      debugLog(`Bewertungs-Importdatei geladen: ${file.name} (${file.size} Bytes).`);
    } catch (err) {
      const msg = "Fehler beim Lesen der Bewertungsdatei: " + (err?.message || String(err));
      if (ratingsImportStatus) ratingsImportStatus.textContent = msg;
      debugLog(msg);
    }
  });
}

if (importRatingsBtn) {
  importRatingsBtn.addEventListener("click", () => {
    const rawText = (ratingsImportTextarea?.value || "").trim();
    if (!rawText) {
      if (ratingsImportStatus) ratingsImportStatus.textContent = "Bitte zuerst Ratings.csv / JSON einfügen oder eine Datei wählen.";
      return;
    }

    try {
      const parsedRatings = parseNetflixRatingsPayload(rawText);
      if (parsedRatings.length === 0) {
        if (ratingsImportStatus) ratingsImportStatus.textContent = "Keine gültigen Bewertungen im Inhalt gefunden.";
        return;
      }

      let ratingSavedCount = 0;
      let addedToSeenCount = 0;
      let watchlistUpdatedCount = 0;
      const shouldAddToSeen = Boolean(addRatedToSeenToggle?.checked);

      parsedRatings.forEach(({ title, rating }) => {
        const key = title.toLowerCase();
        seenRatings[key] = rating;
        ratingSavedCount += 1;

        items.forEach((it) => {
          if (stripMarkdown(it.title || "").toLowerCase() === key) {
            it.rating = rating;
            watchlistUpdatedCount += 1;
          }
        });

        if (shouldAddToSeen && findSeenIndex(title) === -1) {
          addSeenEntry(title, null);
          addedToSeenCount += 1;
        }
      });

      saveSeenRatings();
      saveSeenEntries();
      saveItems();
      renderSeenList();
      renderList();

      const summary =
        `Bewertungen importiert: ${ratingSavedCount} Titel bewertet, ` +
        `${addedToSeenCount} zu „Gesehen“ ergänzt (Gesamt Gesehen: ${seenEntries.length}), ` +
        `${watchlistUpdatedCount} Merklisten-Einträge aktualisiert.`;
      if (ratingsImportStatus) ratingsImportStatus.textContent = summary;
      debugLog(summary);
    } catch (err) {
      const msg = "Bewertungs-Import fehlgeschlagen: " + (err?.message || String(err));
      if (ratingsImportStatus) ratingsImportStatus.textContent = msg;
      debugLog(msg);
    }
  });
}

if (clearRatingsImportInputBtn) {
  clearRatingsImportInputBtn.addEventListener("click", () => {
    if (ratingsImportTextarea) ratingsImportTextarea.value = "";
    if (ratingsImportFileInput) ratingsImportFileInput.value = "";
    if (ratingsImportStatus) ratingsImportStatus.textContent = "Eingabe geleert.";
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
if (seenRatingFilter) {
  seenRatingFilter.addEventListener("change", renderSeenList);
}

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
    ? seenEntries
        .map((e) => {
          const r = getTitleRating(e.title);
          return e.title + (e.type ? " (" + e.type + ")" : "") + (r ? " [Bewertung: " + r + "]" : "");
        })
        .join(", ")
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
let seenRatings = loadSeenRatings();

let enabledProviders = JSON.parse(localStorage.getItem(ACTIVE_PROVIDERS_STORAGE) || "null");
if (!Array.isArray(enabledProviders)) {
  enabledProviders = [...PROVIDERS];
  saveEnabledProviders();
} else {
  enabledProviders = enabledProviders.filter((p) => PROVIDERS.includes(p));
}

renderVersionInfo();
seenCountEl.textContent = String(seenEntries.length);
updateApiBadge();
syncProviderSelects();
renderProviderToggles();
renderList();
renderSeenList();
debugLog("Watchlist-Kurator (" + APP_VERSION + ") initialisiert.");
