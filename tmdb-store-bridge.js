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

function refreshTmdbKeyUi() {
  const input = document.getElementById("tmdbApiKeyInput");
  const hint = document.getElementById("tmdbKeyHint");
  const key = getStoredTmdbKey();

  if (input && document.activeElement !== input) {
    input.value = key;
  }

  if (hint) {
    hint.textContent = key
      ? "TMDB-API-Schlüssel lokal gespeichert (aktiv für Metadaten, Poster & DE-Anbieter)."
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
  const posterUrl = posterPath ? buildPosterUrl(posterPath, "w342") : null;
  const titleText = enriched?.core?.title || fallbackTitle || "Titel";
  const yearText = enriched?.core?.year ? ` (${enriched.core.year})` : "";
  const ratingText = typeof enriched?.meta?.voteAverage === "number"
    ? ` · TMDB ${enriched.meta.voteAverage}`
    : "";
  const flatrateNames = Array.isArray(enriched?.availabilityDE?.flatrate)
    ? enriched.availabilityDE.flatrate.map((p) => p.name).filter(Boolean)
    : [];

  box.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.gap = "12px";
  wrapper.style.alignItems = "flex-start";
  wrapper.style.marginTop = "12px";
  wrapper.style.padding = "10px";
  wrapper.style.borderRadius = "10px";
  wrapper.style.background = "rgba(15, 23, 42, 0.55)";
  wrapper.style.border = "1px solid rgba(148, 163, 184, 0.2)";

  if (posterUrl) {
    const img = document.createElement("img");
    img.src = posterUrl;
    img.alt = "Poster zu " + titleText;
    img.loading = "lazy";
    img.style.width = "92px";
    img.style.height = "138px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.flexShrink = "0";
    wrapper.append(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "meta";
    placeholder.style.width = "92px";
    placeholder.style.height = "138px";
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.textAlign = "center";
    placeholder.style.border = "1px dashed rgba(148, 163, 184, 0.35)";
    placeholder.style.borderRadius = "8px";
    placeholder.style.padding = "6px";
    placeholder.style.flexShrink = "0";
    placeholder.textContent = "Kein Poster gefunden";
    wrapper.append(placeholder);
  }

  const info = document.createElement("div");
  info.style.flex = "1";

  const heading = document.createElement("div");
  heading.style.fontWeight = "700";
  heading.textContent = titleText + yearText + ratingText;
  info.append(heading);

  if (flatrateNames.length > 0) {
    const prov = document.createElement("div");
    prov.className = "meta";
    prov.style.marginTop = "4px";
    prov.textContent = "DE-Abo (Flatrate): " + flatrateNames.join(", ");
    info.append(prov);
  }

  if (enriched?.meta?.overview) {
    const desc = document.createElement("div");
    desc.className = "meta";
    desc.style.marginTop = "6px";
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

  if (hint) hint.textContent = `Lade Poster & DE-Daten für „${cleanTitle}“...`;
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
  runPosterLookup
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bindTmdbKeyControls();
    initStore().catch(() => {});
  });
} else {
  bindTmdbKeyControls();
  initStore().catch(() => {});
}
