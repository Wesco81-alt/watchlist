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
      if (typeof debugLog === "function") {
        debugLog(saved ? "TMDB-API-Schlüssel gespeichert." : "TMDB-API-Schlüssel geleert.");
      }
    });
  }

  if (clearBtn && !clearBtn.dataset.tmdbBridgeBound) {
    clearBtn.dataset.tmdbBridgeBound = "true";
    clearBtn.addEventListener("click", () => {
      setStoredTmdbKey("");
      if (input) input.value = "";
      refreshTmdbKeyUi();
      if (typeof debugLog === "function") {
        debugLog("TMDB-API-Schlüssel gelöscht.");
      }
    });
  }

  refreshTmdbKeyUi();
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

window.WatchlistTmdbBridge = {
  getTmdbKey: getStoredTmdbKey,
  setTmdbKey: setStoredTmdbKey,
  refreshUi: refreshTmdbKeyUi,
  buildPosterUrl,
  buildBackdropUrl,
  findTmdbId,
  fetchTitleEnrichment,
  enrichClassicTitle
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
