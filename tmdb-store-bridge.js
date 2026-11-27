import { buildPosterUrl, buildBackdropUrl, findTmdbId, fetchTitleEnrichment } from "./tmdb.js";
import {
  createTitleKey,
  isCacheExpired,
  configureStore,
  initStore,
  getAllTitles,
  getTitleById,
  findTitleByKey,
  upsertTitle,
  removeTitle,
  enrichTitleIfNeeded
} from "./store.js";

const TMDB_API_KEY_STORAGE = "watchlist_kurator_tmdb_key_v1";
const ACTIVE_PROVIDERS_STORAGE_KEY = "watchlist_kurator_active_providers_v1";

const DEFAULT_CURATOR_PROVIDERS = [
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

const TMDB_TO_CURATOR_PROVIDER_MAP = {
  "netflix": "Netflix",
  "netflix standard with ads": "Netflix",
  "sky go": "Sky",
  "sky show": "Sky",
  "wow": "Sky",
  "ard mediathek": "ARD",
  "das erste": "ARD",
  "zdf": "ZDF",
  "zdf mediathek": "ZDF",
  "3sat": "Tresat",
  "tresat": "Tresat",
  "joyn": "Joyn",
  "joyn plus+": "Joyn",
  "netzkino": "Netzkino",
  "amazon prime video": "Prime Video",
  "prime video": "Prime Video",
  "hbo max": "HBO Max",
  "max": "HBO Max",
  "apple tv": "Apple TV",
  "apple tv+": "Apple TV",
  "rakuten tv": "Rakuten TV"
};

function getStoredTmdbKey() {
  try {
    return String(localStorage.getItem(TMDB_API_KEY_STORAGE) || "").trim();
  } catch {
    return "";
  }
}

function setStoredTmdbKey(key) {
  const clean = String(key || "").trim();
  try {
    if (clean) {
      localStorage.setItem(TMDB_API_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(TMDB_API_KEY_STORAGE);
    }
  } catch {
    // Ignorieren, falls localStorage nicht verfügbar ist
  }
  return clean;
}

function logInfo(msg) {
  if (typeof debugLog === "function") {
    debugLog(msg);
  }
}

function getCuratorProviders() {
  if (Array.isArray(window.PROVIDERS) && window.PROVIDERS.length > 0) {
    return window.PROVIDERS.filter((p) => p && p !== "Sonstiges");
  }
  return DEFAULT_CURATOR_PROVIDERS.filter((p) => p !== "Sonstiges");
}

function getActiveCuratorProviders() {
  const allowed = new Set(getCuratorProviders());

  if (Array.isArray(window.enabledProviders)) {
    const active = window.enabledProviders.filter((p) => allowed.has(p));
    if (active.length > 0) return active;
  }

  try {
    const raw = localStorage.getItem(ACTIVE_PROVIDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const active = parsed.filter((p) => allowed.has(p));
        if (active.length > 0) return active;
      }
    }
  } catch {
    // Ignorieren
  }

  return getCuratorProviders();
}

function mapTmdbProviderNameToCurator(rawName) {
  const clean = String(rawName || "").trim().toLowerCase();
  if (!clean) return null;

  if (TMDB_TO_CURATOR_PROVIDER_MAP[clean]) {
    return TMDB_TO_CURATOR_PROVIDER_MAP[clean];
  }

  for (const [alias, curatorProvider] of Object.entries(TMDB_TO_CURATOR_PROVIDER_MAP)) {
    if (clean.includes(alias)) {
      return curatorProvider;
    }
  }

  const allCurator = getCuratorProviders();
  const directMatch = allCurator.find((p) => p.toLowerCase() === clean);
  return directMatch || null;
}

function getMatchedCuratorProviderBadges(enriched) {
  const buckets = [
    ...(Array.isArray(enriched?.availabilityDE?.flatrate) ? enriched.availabilityDE.flatrate : []),
    ...(Array.isArray(enriched?.availabilityDE?.free) ? enriched.availabilityDE.free : []),
    ...(Array.isArray(enriched?.availabilityDE?.ads) ? enriched.availabilityDE.ads : []),
    ...(Array.isArray(enriched?.availabilityDE?.rent) ? enriched.availabilityDE.rent : []),
    ...(Array.isArray(enriched?.availabilityDE?.buy) ? enriched.availabilityDE.buy : [])
  ];

  const activeProviders = new Set(getActiveCuratorProviders());
  const matched = [];

  for (const entry of buckets) {
    const mapped = mapTmdbProviderNameToCurator(entry?.name || "");
    if (mapped && activeProviders.has(mapped) && !matched.includes(mapped)) {
      matched.push(mapped);
    }
  }

  return matched;
}

function createCuratorProviderBadge(providerName) {
  const badge = document.createElement("span");
  badge.className = "provider-pill tmdb-curator-badge";
  badge.textContent = providerName;
  badge.title = "Verfügbar über Kurator-Anbieter: " + providerName;
  return badge;
}

function renderProviderBadgeLine(parentEl, badges, lineClass = "tmdb-provider-badges-line", insertAfterEl = null) {
  if (!parentEl) return;

  parentEl.querySelectorAll("." + lineClass).forEach((el) => el.remove());

  if (!Array.isArray(badges) || badges.length === 0) return;

  const line = document.createElement("div");
  line.className = lineClass;
  line.style.display = "flex";
  line.style.gap = "8px";
  line.style.flexWrap = "wrap";
  line.style.alignItems = "center";
  line.style.width = "100%";
  line.style.marginTop = "10px";
  line.style.marginBottom = "4px";

  badges.forEach((providerName) => {
    line.append(createCuratorProviderBadge(providerName));
  });

  if (insertAfterEl && insertAfterEl.parentElement === parentEl) {
    insertAfterEl.insertAdjacentElement("afterend", line);
  } else {
    parentEl.append(line);
  }
}

function refreshTmdbKeyUi() {
  const input = document.getElementById("tmdbApiKeyInput");
  const hint = document.getElementById("tmdbKeyHint");
  const key = getStoredTmdbKey();

  if (input && document.activeElement !== input) {
    input.value = key;
  }

  if (hint) {
    hint.textContent = key
      ? "TMDB-API-Schlüssel lokal gespeichert (aktiv für Metadaten, Poster & Kurator-Anbieter)."
      : "Kein TMDB-API-Schlüssel gespeichert.";
  }
}

function normalizeMediaTypeForSchema(typeInput, itemOrTitle = "") {
  const raw = String(typeInput || "").trim().toLowerCase();
  if (raw === "tv" || raw === "serie" || raw === "series") return "tv";
  if (raw === "movie" || raw === "film" || raw === "doku" || raw === "dokumentation") return "movie";

  if (typeof normalizeMediaType === "function") {
    const normalized = normalizeMediaType(typeInput || "", itemOrTitle);
    if (normalized === "Serie") return "tv";
    if (normalized === "Film") return "movie";
  }

  return "movie";
}

async function enrichClassicTitle({ title, type = "movie", year = null, force = false }) {
  const apiKey = getStoredTmdbKey();
  if (!apiKey || !title) return null;

  const schemaType = normalizeMediaTypeForSchema(type, title);
  const existing = findTitleByKey(createTitleKey(title, year, schemaType));

  const record = existing || await upsertTitle({
    title,
    type: schemaType,
    year,
    status: "watchlist"
  });

  return enrichTitleIfNeeded(record.id, fetchTitleEnrichment, apiKey, { force });
}

function renderPosterPreview(enriched, fallbackTitle = "") {
  const box = document.getElementById("tmdbPosterPreviewBox");
  if (!box) return;

  const posterPath = enriched?.meta?.posterPath || null;
  const posterUrl = posterPath ? buildPosterUrl(posterPath, "w780") : null;
  const titleText = enriched?.core?.title || fallbackTitle || "Titel";
  const yearText = enriched?.core?.year ? ` (${enriched.core.year})` : "";
  const ratingText = typeof enriched?.meta?.voteAverage === "number"
    ? ` · TMDB ${enriched.meta.voteAverage}`
    : "";
  const curatorBadges = getMatchedCuratorProviderBadges(enriched);

  box.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "18px";
  wrapper.style.alignItems = "flex-start";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.marginTop = "14px";
  wrapper.style.padding = "14px";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "rgba(15, 23, 42, 0.55)";
  wrapper.style.border = "1px solid rgba(148, 163, 184, 0.2)";

  if (posterUrl) {
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "Poster zu " + titleText;
    img.loading = "lazy";
    img.style.width = "220px";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.aspectRatio = "2 / 3";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.flexShrink = "0";
    wrapper.append(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "meta";
    placeholder.style.width = "220px";
    placeholder.style.maxWidth = "100%";
    placeholder.style.height = "330px";
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.textAlign = "center";
    placeholder.style.border = "1px dashed rgba(148, 163, 184, 0.35)";
    placeholder.style.borderRadius = "8px";
    placeholder.style.padding = "8px";
    placeholder.style.flexShrink = "0";
    placeholder.textContent = "Kein Poster gefunden";
    wrapper.append(placeholder);
  }

  const info = document.createElement("div");
  info.style.flex = "1 1 220px";

  const heading = document.createElement("div");
  heading.style.fontWeight = "700";
  heading.textContent = titleText + yearText + ratingText;
  info.append(heading);

  renderProviderBadgeLine(info, curatorBadges, "tmdb-preview-badges-line", heading);

  if (enriched?.meta?.overview) {
    const desc = document.createElement("div");
    desc.className = "meta";
    desc.style.marginTop = "12px";
    desc.style.lineHeight = "1.55";
    desc.textContent = enriched.meta.overview;
    info.append(desc);
  }

  wrapper.append(info);
  box.append(wrapper);
}

async function runPosterLookup(title, type = "tv", year = null) {
  const cleanTitle = String(title || "").trim();
  const hint = document.getElementById("tmdbKeyHint");
  const apiKey = getStoredTmdbKey();

  if (!apiKey) {
    if (hint) hint.textContent = "Bitte zuerst oben einen TMDB-API-Schlüssel speichern.";
    logInfo("TMDB-Poster-Abruf abgebrochen: Kein TMDB-Key vorhanden.");
    return;
  }

  if (!cleanTitle) {
    if (hint) hint.textContent = "Bitte einen Film- oder Serientitel für die Poster-Vorschau eingeben.";
    return;
  }

  if (hint) hint.textContent = `Lade Poster & Kurator-Anbieter für „${cleanTitle}“...`;
  logInfo(`TMDB-Poster-Abruf gestartet für: "${cleanTitle}" (${type}${year ? ", " + year : ""})`);

  try {
    const result = await enrichClassicTitle({
      title: cleanTitle,
      type,
      year: year ? Number(year) : null,
      force: true
    });
    renderPosterPreview(result, cleanTitle);
    const hasPoster = Boolean(result?.meta?.posterPath);
    if (hint) {
      hint.textContent = hasPoster
        ? `Poster & Metadaten für „${cleanTitle}“ geladen.`
        : `Zu „${cleanTitle}“ wurde kein Poster auf TMDB gefunden.`;
    }
    logInfo(`TMDB-Poster-Abruf fertig für "${cleanTitle}" | posterPath: ${result?.meta?.posterPath || "null"}`);
  } catch (err) {
    if (hint) hint.textContent = "TMDB-Abruf fehlgeschlagen: " + (err?.message || "Unbekannter Fehler");
    logInfo("TMDB-Poster-Abruf Fehler: " + (err?.message || err));
  }
}

function ensurePosterPreviewControls() {
  const card = document.getElementById("tmdbConfigCard");
  if (!card || document.getElementById("tmdbPosterTestRow")) return;

  const row = document.createElement("div");
  row.id = "tmdbPosterTestRow";
  row.className = "row";
  row.style.marginTop = "12px";
  row.style.gap = "8px";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "center";

  const titleInput = document.createElement("input");
  titleInput.id = "tmdbTestTitleInput";
  titleInput.type = "text";
  titleInput.placeholder = "Titel für Poster-Test (z. B. Dark)";
  titleInput.value = "Dark";
  titleInput.style.flex = "1 1 180px";
  titleInput.setAttribute("aria-label", "Titel für TMDB-Poster-Test");

  const typeSelect = document.createElement("select");
  typeSelect.id = "tmdbTestTypeSelect";
  typeSelect.setAttribute("aria-label", "Medientyp für TMDB-Poster-Test");
  typeSelect.innerHTML = '<option value="tv">Serie</option><option value="movie">Film</option>';

  const yearInput = document.createElement("input");
  yearInput.id = "tmdbTestYearInput";
  yearInput.type = "number";
  yearInput.placeholder = "Jahr";
  yearInput.value = "2017";
  yearInput.style.width = "92px";
  yearInput.setAttribute("aria-label", "Erscheinungsjahr für TMDB-Poster-Test");

  const testBtn = document.createElement("button");
  testBtn.id = "tmdbPosterTestBtn";
  testBtn.type = "button";
  testBtn.className = "secondary";
  testBtn.textContent = "Poster laden";

  testBtn.addEventListener("click", () => {
    runPosterLookup(titleInput.value, typeSelect.value, yearInput.value);
  });

  row.append(titleInput, typeSelect, yearInput, testBtn);

  const previewBox = document.createElement("div");
  previewBox.id = "tmdbPosterPreviewBox";

  const hint = document.getElementById("tmdbKeyHint");
  if (hint) {
    hint.insertAdjacentElement("beforebegin", row);
    hint.insertAdjacentElement("afterend", previewBox);
  } else {
    card.append(row, previewBox);
  }
}

function applyPosterAndBadgesToRecCard(card, enriched) {
  if (!card || !enriched) return;

  const posterPath = enriched?.meta?.posterPath || null;
  const posterUrl = posterPath ? buildPosterUrl(posterPath, "w500") : null;
  const curatorBadges = getMatchedCuratorProviderBadges(enriched);

  const head = card.querySelector(".rec-head");
  const headTitleContainer = card.querySelector(".rec-head > div:first-child");
  if (headTitleContainer) {
    renderProviderBadgeLine(headTitleContainer, curatorBadges, "tmdb-rec-badges-line");
  } else if (head) {
    renderProviderBadgeLine(head, curatorBadges, "tmdb-rec-badges-line");
  }

  let posterRow = card.querySelector(".tmdb-rec-poster-row");
  if (!posterRow && posterUrl) {
    posterRow = document.createElement("div");
    posterRow.className = "tmdb-rec-poster-row";
    posterRow.style.display = "flex";
    posterRow.style.gap = "16px";
    posterRow.style.alignItems = "flex-start";
    posterRow.style.flexWrap = "wrap";
    posterRow.style.marginTop = "12px";
    posterRow.style.marginBottom = "4px";

    const badgesLine = card.querySelector(".tmdb-rec-badges-line");
    if (badgesLine && badgesLine.parentElement) {
      badgesLine.insertAdjacentElement("afterend", posterRow);
    } else if (head && head.nextSibling) {
      card.insertBefore(posterRow, head.nextSibling);
    } else {
      card.prepend(posterRow);
    }
  }

  if (!posterRow) return;
  posterRow.innerHTML = "";

  if (posterUrl) {
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "Poster";
    img.loading = "lazy";
    img.style.width = "168px";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.aspectRatio = "2 / 3";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.flexShrink = "0";
    posterRow.append(img);
  }
}

async function enrichRecommendationContainer(container) {
  const target = container || document.getElementById("aiRecommendations");
  if (!target || !getStoredTmdbKey()) return;

  const cards = Array.from(target.querySelectorAll(".rec-card"));
  for (const card of cards) {
    const titleEl = card.querySelector(".rec-head strong");
    const title = (titleEl?.textContent || "").trim();
    if (!title) continue;

    const typePillText = (card.querySelector(".rec-head .type-pill")?.textContent || "").trim();
    const yearMatch = (card.querySelector(".rec-head")?.textContent || "").match(/\((\d{4})\)/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    try {
      const enriched = await enrichClassicTitle({
        title,
        type: typePillText,
        year
      });
      applyPosterAndBadgesToRecCard(card, enriched);
    } catch (err) {
      logInfo(`TMDB-Anreicherung für „${title}“ fehlgeschlagen: ${err?.message || err}`);
    }
  }
}

function applyPosterBadgesAndOverviewToListItem(itemEl, enriched, cssClassName, includeProviderBadges = true) {
  if (!itemEl || !enriched) return;

  const posterPath = enriched?.meta?.posterPath || null;
  const posterUrl = posterPath ? buildPosterUrl(posterPath, "w500") : null;
  const overview = String(enriched?.meta?.overview || "").trim();
  const curatorBadges = includeProviderBadges ? getMatchedCuratorProviderBadges(enriched) : [];

  const titleRow = itemEl.querySelector(":scope > div:first-child > div:first-child");
  const titleContainer = itemEl.querySelector(":scope > div:first-child");
  if (titleRow) {
    renderProviderBadgeLine(titleRow, curatorBadges, "tmdb-item-badges-line");
  } else if (titleContainer) {
    renderProviderBadgeLine(titleContainer, curatorBadges, "tmdb-item-badges-line", titleContainer.firstElementChild);
  }

  if (!posterUrl && !overview) return;

  let detailBox = itemEl.querySelector("." + cssClassName);
  if (!detailBox) {
    detailBox = document.createElement("div");
    detailBox.className = cssClassName;
    detailBox.style.width = "100%";
    detailBox.style.display = "flex";
    detailBox.style.gap = "16px";
    detailBox.style.alignItems = "flex-start";
    detailBox.style.flexWrap = "wrap";
    detailBox.style.marginTop = "12px";
    detailBox.style.paddingTop = "12px";
    detailBox.style.borderTop = "1px solid rgba(148, 163, 184, 0.16)";
    itemEl.append(detailBox);
  }

  detailBox.innerHTML = "";

  if (posterUrl) {
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "Poster zu " + (enriched?.core?.title || "Titel");
    img.loading = "lazy";
    img.style.width = "156px";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.aspectRatio = "2 / 3";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.flexShrink = "0";
    detailBox.append(img);
  }

  const textCol = document.createElement("div");
  textCol.style.flex = "1 1 200px";

  if (overview) {
    const summaryEl = document.createElement("div");
    summaryEl.className = "meta";
    summaryEl.style.marginTop = "0";
    summaryEl.style.lineHeight = "1.55";
    summaryEl.style.color = "#cbd5e1";
    summaryEl.textContent = overview;
    textCol.append(summaryEl);
  } else {
    const noSummaryEl = document.createElement("div");
    noSummaryEl.className = "meta";
    noSummaryEl.style.marginTop = "0";
    noSummaryEl.style.lineHeight = "1.55";
    noSummaryEl.textContent = "Keine Inhaltsangabe auf TMDB hinterlegt.";
    textCol.append(noSummaryEl);
  }

  detailBox.append(textCol);
}

async function enrichWatchlistContainer(container) {
  const target = container || document.getElementById("watchlistContainer");
  if (!target || !getStoredTmdbKey()) return;

  const itemEls = Array.from(target.querySelectorAll(".item"));
  for (const itemEl of itemEls) {
    const titleEl = itemEl.querySelector("strong");
    const title = (titleEl?.textContent || "").trim();
    if (!title) continue;

    const typePillText = (itemEl.querySelector(".type-pill")?.textContent || "").trim();
    const yearMatch = (itemEl.textContent || "").match(/\((\d{4})\)/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    try {
      const enriched = await enrichClassicTitle({
        title,
        type: typePillText,
        year
      });
      applyPosterBadgesAndOverviewToListItem(itemEl, enriched, "tmdb-watchlist-details", true);
    } catch (err) {
      logInfo(`TMDB-Merklisten-Anreicherung für „${title}“ fehlgeschlagen: ${err?.message || err}`);
    }
  }
}

async function enrichSeenContainer(container) {
  const target = container || document.getElementById("seenContainer");
  if (!target || !getStoredTmdbKey()) return;

  const itemEls = Array.from(target.querySelectorAll(".item"));
  for (const itemEl of itemEls) {
    const titleEl = itemEl.querySelector("strong");
    const title = (titleEl?.textContent || "").trim();
    if (!title) continue;

    const typePillText = (itemEl.querySelector(".type-pill")?.textContent || "").trim();
    const yearMatch = (itemEl.textContent || "").match(/\((\d{4})\)/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    try {
      const enriched = await enrichClassicTitle({
        title,
        type: typePillText,
        year
      });
      applyPosterBadgesAndOverviewToListItem(itemEl, enriched, "tmdb-seen-details", true);
    } catch (err) {
      logInfo(`TMDB-Gesehen-Anreicherung für „${title}“ fehlgeschlagen: ${err?.message || err}`);
    }
  }
}

function hookRenderingFunctions() {
  if (typeof window.renderRecommendations === "function" && !window.renderRecommendations.__tmdbHooked) {
    const orig = window.renderRecommendations;
    const wrapped = function (container, recs) {
      const out = orig.call(this, container, recs);
      enrichRecommendationContainer(container);
      return out;
    };
    wrapped.__tmdbHooked = true;
    window.renderRecommendations = wrapped;
  }

  if (typeof window.renderList === "function" && !window.renderList.__tmdbWatchlistHooked) {
    const origList = window.renderList;
    const wrappedList = function (...args) {
      const out = origList.apply(this, args);
      enrichWatchlistContainer(document.getElementById("watchlistContainer"));
      return out;
    };
    wrappedList.__tmdbWatchlistHooked = true;
    window.renderList = wrappedList;
  }

  if (typeof window.renderSeenList === "function" && !window.renderSeenList.__tmdbSeenHooked) {
    const origSeen = window.renderSeenList;
    const wrappedSeen = function (...args) {
      const out = origSeen.apply(this, args);
      enrichSeenContainer(document.getElementById("seenContainer"));
      return out;
    };
    wrappedSeen.__tmdbSeenHooked = true;
    window.renderSeenList = wrappedSeen;
  }
}

function bindTmdbKeyControls() {
  const input = document.getElementById("tmdbApiKeyInput");
  const saveBtn = document.getElementById("saveTmdbKeyBtn");
  const clearBtn = document.getElementById("clearTmdbKeyBtn");

  if (input && !input.dataset.tmdbBridgeBound) {
    input.dataset.tmdbBridgeBound = "true";
    input.value = getStoredTmdbKey();
    input.addEventListener("change", () => {
      setStoredTmdbKey(input.value);
      refreshTmdbKeyUi();
    });
  }

  if (saveBtn && !saveBtn.dataset.tmdbBridgeBound) {
    saveBtn.dataset.tmdbBridgeBound = "true";
    saveBtn.addEventListener("click", () => {
      const saved = setStoredTmdbKey(input ? input.value : "");
      refreshTmdbKeyUi();
      logInfo(saved ? "TMDB-API-Schlüssel gespeichert." : "TMDB-API-Schlüssel geleert.");
    });
  }

  if (clearBtn && !clearBtn.dataset.tmdbBridgeBound) {
    clearBtn.dataset.tmdbBridgeBound = "true";
    clearBtn.addEventListener("click", () => {
      setStoredTmdbKey("");
      if (input) input.value = "";
      refreshTmdbKeyUi();
      logInfo("TMDB-API-Schlüssel gelöscht.");
    });
  }

  ensurePosterPreviewControls();
  refreshTmdbKeyUi();
  hookRenderingFunctions();
}

window.WatchlistTmdbBridge = {
  getTmdbKey: getStoredTmdbKey,
  setTmdbKey: setStoredTmdbKey,
  refreshUi: refreshTmdbKeyUi,
  buildPosterUrl,
  buildBackdropUrl,
  findTmdbId,
  fetchTitleEnrichment,
  enrichClassicTitle,
  runPosterLookup,
  enrichRecommendationContainer,
  enrichWatchlistContainer,
  enrichSeenContainer,
  hookRenderingFunctions
};

window.WatchlistStoreBridge = {
  createTitleKey,
  isCacheExpired,
  configureStore,
  initStore,
  getAllTitles,
  getTitleById,
  findTitleByKey,
  upsertTitle,
  removeTitle,
  enrichTitleIfNeeded
};

function initBridge() {
  bindTmdbKeyControls();
  initStore().catch(() => {});
  setTimeout(() => {
    hookRenderingFunctions();
    enrichRecommendationContainer();
    enrichWatchlistContainer();
    enrichSeenContainer();
  }, 150);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBridge);
} else {
  initBridge();
}
