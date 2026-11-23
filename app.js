const APP_VERSION = "lokaler Stand (dev)";[span_0](start_span)[span_0](end_span)
const STORAGE_KEY = "watchlist_kurator_items_v4";[span_1](start_span)[span_1](end_span)
const SEEN_TITLES_STORAGE = "watchlist_kurator_seen_titles_v2";[span_2](start_span)[span_2](end_span)
const SEEN_TITLES_LEGACY_STORAGE = "watchlist_kurator_seen_titles_v1";[span_3](start_span)[span_3](end_span)
const SEEN_RATINGS_STORAGE = "watchlist_kurator_seen_ratings_v1";[span_4](start_span)[span_4](end_span)
const API_KEY_STORAGE = "watchlist_kurator_gemini_key_v1";[span_5](start_span)[span_5](end_span)
const ACTIVE_PROVIDERS_STORAGE = "watchlist_kurator_active_providers_v1";[span_6](start_span)[span_6](end_span)
const DEFAULT_SEEN_MIN_SECONDS = 300;[span_7](start_span)[span_7](end_span)
const PROVIDERS = [[span_8](start_span)[span_8](end_span)
  "Sky",[span_9](start_span)[span_9](end_span)
  "Netflix",[span_10](start_span)[span_10](end_span)
  "ARD",[span_11](start_span)[span_11](end_span)
  "ZDF",[span_12](start_span)[span_12](end_span)
  "Tresat",[span_13](start_span)[span_13](end_span)
  "Joyn",[span_14](start_span)[span_14](end_span)
  "Netzkino",[span_15](start_span)[span_15](end_span)
  "Prime Video",[span_16](start_span)[span_16](end_span)
  "HBO Max",[span_17](start_span)[span_17](end_span)
  "Apple TV",[span_18](start_span)[span_18](end_span)
  "Rakuten TV",[span_19](start_span)[span_19](end_span)
  "Sonstiges[span_20](start_span)"[span_20](end_span)
];[span_21](start_span)[span_21](end_span)
const MEDIATHEK_FREE_PROVIDERS = ["ARD", "ZDF", "Tresat", "Joyn", "Netzkino"];[span_22](start_span)[span_22](end_span)
const RATINGS = ["Nicht gefällt mir", "Gefällt mir", "Finde ich super"];[span_23](start_span)[span_23](end_span)

const navButtons = Array.from(document.querySelectorAll(".nav-btn"));[span_24](start_span)[span_24](end_span)
const views = Array.from(document.querySelectorAll(".view"));[span_25](start_span)[span_25](end_span)
const watchlistCountEl = document.getElementById("watchlistCount");[span_26](start_span)[span_26](end_span)
const seenCountEl = document.getElementById("seenCount");[span_27](start_span)[span_27](end_span)
const activeProvidersCountEl = document.getElementById("activeProvidersCount");[span_28](start_span)[span_28](end_span)
const activeProviderSummaryEl = document.getElementById("activeProviderSummary");[span_29](start_span)[span_29](end_span)
const providerToggleGrid = document.getElementById("providerToggleGrid");[span_30](start_span)[span_30](end_span)
const selectAllProvidersBtn = document.getElementById("selectAllProvidersBtn");[span_31](start_span)[span_31](end_span)
const selectMediathekenBtn = document.getElementById("selectMediathekenBtn");[span_32](start_span)[span_32](end_span)
const clearProvidersBtn = document.getElementById("clearProvidersBtn");[span_33](start_span)[span_33](end_span)

const watchlistContainer = document.getElementById("watchlistContainer");[span_34](start_span)[span_34](end_span)
const seenContainer = document.getElementById("seenContainer");[span_35](start_span)[span_35](end_span)
const addForm = document.getElementById("addForm");[span_36](start_span)[span_36](end_span)
const titleInput = document.getElementById("titleInput");[span_37](start_span)[span_37](end_span)
const typeInput = document.getElementById("typeInput");[span_38](start_span)[span_38](end_span)
const providerInput = document.getElementById("providerInput");[span_39](start_span)[span_39](end_span)
const statusInput = document.getElementById("statusInput");[span_40](start_span)[span_40](end_span)
const providerFilter = document.getElementById("providerFilter");[span_41](start_span)[span_41](end_span)
const ratingFilter = document.getElementById("ratingFilter");[span_42](start_span)[span_42](end_span)
const seenRatingFilter = document.getElementById("seenRatingFilter");[span_43](start_span)[span_43](end_span)
const seenTypeFilter = document.getElementById("seenTypeFilter");[span_44](start_span)[span_44](end_span)
const apiKeyInput = document.getElementById("apiKeyInput");[span_45](start_span)[span_45](end_span)
const saveKeyBtn = document.getElementById("saveKeyBtn");[span_46](start_span)[span_46](end_span)
const clearKeyBtn = document.getElementById("clearKeyBtn");[span_47](start_span)[span_47](end_span)
const apiStatus = document.getElementById("apiStatus");[span_48](start_span)[span_48](end_span)
const moodInput = document.getElementById("moodInput");[span_49](start_span)[span_49](end_span)
const availabilityMode = document.getElementById("availabilityMode");[span_50](start_span)[span_50](end_span)
const useSearchToggle = document.getElementById("useSearchToggle");[span_51](start_span)[span_51](end_span)
const recommendBtn = document.getElementById("recommendBtn");[span_52](start_span)[span_52](end_span)
const aiStatus = document.getElementById("aiStatus");[span_53](start_span)[span_53](end_span)
const aiRecommendations = document.getElementById("aiRecommendations");[span_54](start_span)[span_54](end_span)
const seenImportFileInput = document.getElementById("seenImportFileInput");[span_55](start_span)[span_55](end_span)
const seenMinSecondsInput = document.getElementById("seenMinSecondsInput");[span_56](start_span)[span_56](end_span)
const seenImportTextarea = document.getElementById("seenImportTextarea");[span_57](start_span)[span_57](end_span)
const replaceSeenToggle = document.getElementById("replaceSeenToggle");[span_58](start_span)[span_58](end_span)
const importSeenBtn = document.getElementById("importSeenBtn");[span_59](start_span)[span_59](end_span)
const clearSeenImportInputBtn = document.getElementById("clearSeenImportInputBtn");[span_60](start_span)[span_60](end_span)
const seenImportStatus = document.getElementById("seenImportStatus");[span_61](start_span)[span_61](end_span)
const ratingsImportFileInput = document.getElementById("ratingsImportFileInput");[span_62](start_span)[span_62](end_span)
const ratingsImportTextarea = document.getElementById("ratingsImportTextarea");[span_63](start_span)[span_63](end_span)
const addRatedToSeenToggle = document.getElementById("addRatedToSeenToggle");[span_64](start_span)[span_64](end_span)
const importRatingsBtn = document.getElementById("importRatingsBtn");[span_65](start_span)[span_65](end_span)
const clearRatingsImportInputBtn = document.getElementById("clearRatingsImportInputBtn");[span_66](start_span)[span_66](end_span)
const ratingsImportStatus = document.getElementById("ratingsImportStatus");[span_67](start_span)[span_67](end_span)
const debugOutput = document.getElementById("debugOutput");[span_68](start_span)[span_68](end_span)
const copyDebugBtn = document.getElementById("copyDebugBtn");[span_69](start_span)[span_69](end_span)
const clearDebugBtn = document.getElementById("clearDebugBtn");[span_70](start_span)[span_70](end_span)
const appVersionInfoEl = document.getElementById("appVersionInfo");[span_71](start_span)[span_71](end_span)

let debugLines = [];[span_72](start_span)[span_72](end_span)

function renderVersionInfo() {[span_73](start_span)[span_73](end_span)
  if (appVersionInfoEl) {[span_74](start_span)[span_74](end_span)
    appVersionInfoEl.textContent = "Version: " + APP_VERSION;[span_75](start_span)[span_75](end_span)
  }
}

function switchView(viewId) {[span_76](start_span)[span_76](end_span)
  views.forEach((v) => v.classList.toggle("active", v.id === viewId));[span_77](start_span)[span_77](end_span)
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === viewId));[span_78](start_span)[span_78](end_span)
  window.scrollTo({ top: 0, behavior: "smooth" });[span_79](start_span)[span_79](end_span)
}

navButtons.forEach((btn) => {[span_80](start_span)[span_80](end_span)
  btn.addEventListener("click", () => switchView(btn.dataset.view));[span_81](start_span)[span_81](end_span)
});

function debugLog(message) {[span_82](start_span)[span_82](end_span)
  const now = new Date().toISOString().slice(11, 23);[span_83](start_span)[span_83](end_span)
  debugLines.push("[" + now + "] " + message);[span_84](start_span)[span_84](end_span)
  if (debugLines.length > 80) debugLines = debugLines.slice(-80);[span_85](start_span)[span_85](end_span)
  if (debugOutput) {[span_86](start_span)[span_86](end_span)
    debugOutput.textContent = debugLines.join("\n");[span_87](start_span)[span_87](end_span)
    debugOutput.scrollTop = debugOutput.scrollHeight;[span_88](start_span)[span_88](end_span)
  }
}

copyDebugBtn.addEventListener("click", async () => {[span_89](start_span)[span_89](end_span)
  try {[span_90](start_span)[span_90](end_span)
    await navigator.clipboard.writeText(debugOutput.textContent);[span_91](start_span)[span_91](end_span)
    copyDebugBtn.textContent = "Kopiert";[span_92](start_span)[span_92](end_span)
    setTimeout(() => { copyDebugBtn.textContent = "Log kopieren"; }, 1500);[span_93](start_span)[span_93](end_span)
  } catch {[span_94](start_span)[span_94](end_span)
    debugLog("Zwischenablage nicht direkt verfügbar – Text manuell markieren.");[span_95](start_span)[span_95](end_span)
  }
});[span_96](start_span)[span_96](end_span)

clearDebugBtn.addEventListener("click", () => {[span_97](start_span)[span_97](end_span)
  debugLines = [];[span_98](start_span)[span_98](end_span)
  debugOutput.textContent = "Log geleert.";[span_99](start_span)[span_99](end_span)
});[span_100](start_span)[span_100](end_span)

function saveItems() {[span_101](start_span)[span_101](end_span)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));[span_102](start_span)[span_102](end_span)
  if (watchlistCountEl) {[span_103](start_span)[span_103](end_span)
    watchlistCountEl.textContent = String(items.length);[span_104](start_span)[span_104](end_span)
  }
}

function saveSeenEntries() {[span_105](start_span)[span_105](end_span)
  localStorage.setItem(SEEN_TITLES_STORAGE, JSON.stringify(seenEntries));[span_106](start_span)[span_106](end_span)
  if (seenCountEl) {[span_107](start_span)[span_107](end_span)
    seenCountEl.textContent = String(seenEntries.length);[span_108](start_span)[span_108](end_span)
  }
}

function saveSeenRatings() {[span_109](start_span)[span_109](end_span)
  localStorage.setItem(SEEN_RATINGS_STORAGE, JSON.stringify(seenRatings));[span_110](start_span)[span_110](end_span)
}

function loadSeenRatings() {[span_111](start_span)[span_111](end_span)
  const raw = localStorage.getItem(SEEN_RATINGS_STORAGE);[span_112](start_span)[span_112](end_span)
  const map = {};[span_113](start_span)[span_113](end_span)
  if (raw) {[span_114](start_span)[span_114](end_span)
    try {[span_115](start_span)[span_115](end_span)
      const parsed = JSON.parse(raw);[span_116](start_span)[span_116](end_span)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {[span_117](start_span)[span_117](end_span)
        Object.entries(parsed).forEach(([k, v]) => {[span_118](start_span)[span_118](end_span)
          const key = stripMarkdown(k).toLowerCase();[span_119](start_span)[span_119](end_span)
          if (key && RATINGS.includes(v)) {[span_120](start_span)[span_120](end_span)
            map[key] = v;[span_121](start_span)[span_121](end_span)
          }
        });[span_122](start_span)[span_122](end_span)
      }
    } catch {[span_123](start_span)[span_123](end_span)
      // ignore[span_124](start_span)[span_124](end_span)
    }
  }
  if (Array.isArray(items)) {[span_125](start_span)[span_125](end_span)
    items.forEach((it) => {[span_126](start_span)[span_126](end_span)
      const key = stripMarkdown(it.title || "").toLowerCase();[span_127](start_span)[span_127](end_span)
      if (key && RATINGS.includes(it.rating) && !map[key]) {[span_128](start_span)[span_128](end_span)
        map[key] = it.rating;[span_129](start_span)[span_129](end_span)
      }
    });[span_130](start_span)[span_130](end_span)
  }
  return map;[span_131](start_span)[span_131](end_span)
}

function getTitleRating(title) {[span_132](start_span)[span_132](end_span)
  const key = stripMarkdown(title).toLowerCase();[span_133](start_span)[span_133](end_span)
  if (key && RATINGS.includes(seenRatings[key])) {[span_134](start_span)[span_134](end_span)
    return seenRatings[key];[span_135](start_span)[span_135](end_span)
  }
  const watchMatch = items.find((i) => stripMarkdown(i.title || "").toLowerCase() === key);[span_136](start_span)[span_136](end_span)
  if (watchMatch && RATINGS.includes(watchMatch.rating)) {[span_137](start_span)[span_137](end_span)
    return watchMatch.rating;[span_138](start_span)[span_138](end_span)
  }
  return null;[span_139](start_span)[span_139](end_span)
}

function setTitleRating(title, nextRating) {[span_140](start_span)[span_140](end_span)
  const clean = stripMarkdown(title);[span_141](start_span)[span_141](end_span)
  const key = clean.toLowerCase();[span_142](start_span)[span_142](end_span)
  if (!key) return;[span_143](start_span)[span_143](end_span)

  const validRating = RATINGS.includes(nextRating) ? nextRating : null;[span_144](start_span)[span_144](end_span)
  if (validRating) {[span_145](start_span)[span_145](end_span)
    seenRatings[key] = validRating;[span_146](start_span)[span_146](end_span)
  } else {[span_147](start_span)[span_147](end_span)
    delete seenRatings[key];[span_148](start_span)[span_148](end_span)
  }
  saveSeenRatings();[span_149](start_span)[span_149](end_span)

  items.forEach((it) => {[span_150](start_span)[span_150](end_span)
    if (stripMarkdown(it.title || "").toLowerCase() === key) {[span_151](start_span)[span_151](end_span)
      it.rating = validRating;[span_152](start_span)[span_152](end_span)
    }
  });[span_153](start_span)[span_153](end_span)
  saveItems();[span_154](start_span)[span_154](end_span)
}

function findSeenIndex(title) {[span_155](start_span)[span_155](end_span)
  const lower = stripMarkdown(title).toLowerCase();[span_156](start_span)[span_156](end_span)
  return seenEntries.findIndex((e) => String(e.title).toLowerCase() === lower);[span_157](start_span)[span_157](end_span)
}

function isTitleMarkedSeen(title) {[span_158](start_span)[span_158](end_span)
  return findSeenIndex(title) !== -1;[span_159](start_span)[span_159](end_span)
}

function inferKnownTypeForTitle(title) {[span_160](start_span)[span_160](end_span)
  const lower = stripMarkdown(title).toLowerCase();[span_161](start_span)[span_161](end_span)
  if (!lower) return null;[span_162](start_span)[span_162](end_span)
  const seenMatch = seenEntries.find((e) => stripMarkdown(e.title || "").toLowerCase() === lower && e.type);[span_163](start_span)[span_163](end_span)
  if (seenMatch?.type) return normalizeMediaType(seenMatch.type);[span_164](start_span)[span_164](end_span)
  const watchMatch = items.find((i) => stripMarkdown(i.title || "").toLowerCase() === lower && i.type);[span_165](start_span)[span_165](end_span)
  if (watchMatch?.type) return normalizeMediaType(watchMatch.type);[span_166](start_span)[span_166](end_span)
  return null;[span_167](start_span)[span_167](end_span)
}

function autoInferMediaType(title) {
  const clean = stripMarkdown(title || "");
  if (!clean) return null;

  const known = inferKnownTypeForTitle(clean);
  if (known) return known;

  if (
    /:\s*(?:staffel|season|miniserie|limited series|folge|episode|teil)\s*\d*/i.test(clean) ||
    /\(\s*(?:staffel|season|miniserie|folge|episode)\b/i.test(clean) ||
    /\b(?:staffel\s+\d+|miniserie|limited\s+series|tv-serie)\b/i.test(clean)
  ) {
    return "Serie";
  }

  if (/\b(?:doku|dokumentation|dokumentarfilm)\b/i.test(clean)) {
    return "Doku";
  }

  if (/\b(?:film|spielfilm|kinofilm|movie|director'?s cut|extended version)\b/i.test(clean)) {
    return "Film";
  }

  return null;
}

function autoFillMissingSeenTypes(entries) {
  if (!Array.isArray(entries)) return 0;
  let filledCount = 0;
  entries.forEach((entry) => {
    if (!entry || !entry.title || entry.type) return;
    const inferred = autoInferMediaType(entry.title);
    if (inferred) {
      entry.type = normalizeMediaType(inferred);
      filledCount += 1;
    }
  });
  return filledCount;
}

function cycleSeenEntryType(title) {[span_168](start_span)[span_168](end_span)
  const idx = findSeenIndex(title);[span_169](start_span)[span_169](end_span)
  if (idx === -1) return null;[span_170](start_span)[span_170](end_span)
  const current = seenEntries[idx].type;[span_171](start_span)[span_171](end_span)
  let nextType = "Serie";[span_172](start_span)[span_172](end_span)
  if (current === "Serie") nextType = "Film";[span_173](start_span)[span_173](end_span)
  else if (current === "Film") nextType = null;[span_174](start_span)[span_174](end_span)
  seenEntries[idx].type = nextType;[span_175](start_span)[span_175](end_span)
  saveSeenEntries();[span_176](start_span)[span_176](end_span)
  return nextType;[span_177](start_span)[span_177](end_span)
}

function addSeenEntry(title, mediaType = null) {[span_178](start_span)[span_178](end_span)
  const clean = stripMarkdown(title);[span_179](start_span)[span_179](end_span)
  if (!clean) return;[span_180](start_span)[span_180](end_span)
  const idx = findSeenIndex(clean);[span_181](start_span)[span_181](end_span)
  const resolvedRawType = mediaType || autoInferMediaType(clean);
  const normalizedType = resolvedRawType ? normalizeMediaType(resolvedRawType) : null;[span_182](start_span)[span_182](end_span)
  if (idx === -1) {[span_183](start_span)[span_183](end_span)
    seenEntries.unshift({ title: clean, type: normalizedType });[span_184](start_span)[span_184](end_span)
  } else if (normalizedType && !seenEntries[idx].type) {[span_185](start_span)[span_185](end_span)
    seenEntries[idx].type = normalizedType;[span_186](start_span)[span_186](end_span)
  }
  saveSeenEntries();[span_187](start_span)[span_187](end_span)
}

function removeSeenEntry(title) {[span_188](start_span)[span_188](end_span)
  const clean = stripMarkdown(title);[span_189](start_span)[span_189](end_span)
  if (!clean) return;[span_190](start_span)[span_190](end_span)
  const lower = clean.toLowerCase();[span_191](start_span)[span_191](end_span)
  seenEntries = seenEntries.filter((e) => String(e.title).toLowerCase() !== lower);[span_192](start_span)[span_192](end_span)
  saveSeenEntries();[span_193](start_span)[span_193](end_span)
}

function toggleSeenTitle(title, mediaType = null) {[span_194](start_span)[span_194](end_span)
  const clean = stripMarkdown(title);[span_195](start_span)[span_195](end_span)
  if (!clean) return false;[span_196](start_span)[span_196](end_span)
  if (isTitleMarkedSeen(clean)) {[span_197](start_span)[span_197](end_span)
    removeSeenEntry(clean);[span_198](start_span)[span_198](end_span)
    renderSeenList();[span_199](start_span)[span_199](end_span)
    return false;[span_200](start_span)[span_200](end_span)
  } else {[span_201](start_span)[span_201](end_span)
    addSeenEntry(clean, mediaType);[span_202](start_span)[span_202](end_span)
    renderSeenList();[span_203](start_span)[span_203](end_span)
    return true;[span_204](start_span)[span_204](end_span)
  }
}

function markTitleAsSeen(title, mediaType = null) {[span_205](start_span)[span_205](end_span)
  const clean = stripMarkdown(title);[span_206](start_span)[span_206](end_span)
  if (!clean) return;[span_207](start_span)[span_207](end_span)
  const lower = clean.toLowerCase();[span_208](start_span)[span_208](end_span)
  const existingItem = items.find((entry) => stripMarkdown(entry.title).toLowerCase() === lower);[span_209](start_span)[span_209](end_span)
  const resolvedType = mediaType || existingItem?.type || autoInferMediaType(clean) || null;[span_210](start_span)[span_210](end_span)
  if (existingItem && RATINGS.includes(existingItem.rating) && !seenRatings[lower]) {[span_211](start_span)[span_211](end_span)
    seenRatings[lower] = existingItem.rating;[span_212](start_span)[span_212](end_span)
    saveSeenRatings();[span_213](start_span)[span_213](end_span)
  }
  addSeenEntry(clean, resolvedType);[span_214](start_span)[span_214](end_span)
  items = items.filter((entry) => stripMarkdown(entry.title).toLowerCase() !== lower);[span_215](start_span)[span_215](end_span)
  saveItems();[span_216](start_span)[span_216](end_span)
  renderList();[span_217](start_span)[span_217](end_span)
  renderSeenList();[span_218](start_span)[span_218](end_span)
}

function createSeenButton(title, mediaType = null, onAfterToggle = null) {[span_219](start_span)[span_219](end_span)
  let isSeen = isTitleMarkedSeen(title);[span_220](start_span)[span_220](end_span)
  const seenBtn = document.createElement("button");[span_221](start_span)[span_221](end_span)
  seenBtn.type = "button";[span_222](start_span)[span_222](end_span)
  seenBtn.className = "seen-btn" + (isSeen ? " active" : "");[span_223](start_span)[span_223](end_span)
  seenBtn.textContent = "✓ Gesehen";[span_224](start_span)[span_224](end_span)
  seenBtn.title = "Als bereits gesehen markieren";[span_225](start_span)[span_225](end_span)
  seenBtn.setAttribute("aria-label", "Als bereits gesehen markieren");[span_226](start_span)[span_226](end_span)
  seenBtn.setAttribute("aria-pressed", String(isSeen));[span_227](start_span)[span_227](end_span)
  seenBtn.addEventListener("click", () => {[span_228](start_span)[span_228](end_span)
    isSeen = toggleSeenTitle(title, mediaType);[span_229](start_span)[span_229](end_span)
    seenBtn.classList.toggle("active", isSeen);[span_230](start_span)[span_230](end_span)
    seenBtn.setAttribute("aria-pressed", String(isSeen));[span_231](start_span)[span_231](end_span)
    if (typeof onAfterToggle === "function") {[span_232](start_span)[span_232](end_span)
      onAfterToggle(isSeen);[span_233](start_span)[span_233](end_span)
    }
  });[span_234](start_span)[span_234](end_span)
  return seenBtn;[span_235](start_span)[span_235](end_span)
}

function saveEnabledProviders() {[span_236](start_span)[span_236](end_span)
  localStorage.setItem(ACTIVE_PROVIDERS_STORAGE, JSON.stringify(enabledProviders));[span_237](start_span)[span_237](end_span)
  syncProviderSelects();[span_238](start_span)[span_238](end_span)
  renderProviderToggles();[span_239](start_span)[span_239](end_span)
}

function syncProviderSelects() {[span_240](start_span)[span_240](end_span)
  const previousInputValue = providerInput.value;[span_241](start_span)[span_241](end_span)
  const previousFilterValue = providerFilter.value;[span_242](start_span)[span_242](end_span)

  const selectableForAdd = enabledProviders.length > 0 ? enabledProviders : PROVIDERS;[span_243](start_span)[span_243](end_span)
  providerInput.innerHTML = selectableForAdd[span_244](start_span)[span_244](end_span)
    .map((p) => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>")[span_245](start_span)[span_245](end_span)
    .join("");[span_246](start_span)[span_246](end_span)
  if (selectableForAdd.includes(previousInputValue)) {[span_247](start_span)[span_247](end_span)
    providerInput.value = previousInputValue;[span_248](start_span)[span_248](end_span)
  }

  providerFilter.innerHTML =[span_249](start_span)[span_249](end_span)
    '<option value="Alle">Alle Anbieter</option>' +[span_250](start_span)[span_250](end_span)
    PROVIDERS.map((p) => '<option value="' + escapeHtml(p) + '">' + escapeHtml(p) + "</option>").join("");[span_251](start_span)[span_251](end_span)
  if (["Alle", ...PROVIDERS].includes(previousFilterValue)) {[span_252](start_span)[span_252](end_span)
    providerFilter.value = previousFilterValue;[span_253](start_span)[span_253](end_span)
  }

  if (activeProvidersCountEl) {[span_254](start_span)[span_254](end_span)
    activeProvidersCountEl.textContent = String(enabledProviders.length);[span_255](start_span)[span_255](end_span)
  }
  if (activeProviderSummaryEl) {[span_256](start_span)[span_256](end_span)
    if (enabledProviders.length === 0) {[span_257](start_span)[span_257](end_span)
      activeProviderSummaryEl.textContent = "Aktive Anbieter: Keine ausgewählt (bitte unter „Anbieter“ wählen).";[span_258](start_span)[span_258](end_span)
    } else if (enabledProviders.length === PROVIDERS.length) {[span_259](start_span)[span_259](end_span)
      activeProviderSummaryEl.textContent = "Aktive Anbieter: Alle (" + PROVIDERS.length + ")";[span_260](start_span)[span_260](end_span)
    } else {[span_261](start_span)[span_261](end_span)
      activeProviderSummaryEl.textContent = "Aktive Anbieter: " + enabledProviders.join(", ");[span_262](start_span)[span_262](end_span)
    }
  }
}

function toggleProvider(provider) {[span_263](start_span)[span_263](end_span)
  if (enabledProviders.includes(provider)) {[span_264](start_span)[span_264](end_span)
    enabledProviders = enabledProviders.filter((p) => p !== provider);[span_265](start_span)[span_265](end_span)
  } else {[span_266](start_span)[span_266](end_span)
    enabledProviders.push(provider);[span_267](start_span)[span_267](end_span)
  }
  saveEnabledProviders();[span_268](start_span)[span_268](end_span)
}

function renderProviderToggles() {[span_269](start_span)[span_269](end_span)
  if (!providerToggleGrid) return;[span_270](start_span)[span_270](end_span)
  providerToggleGrid.innerHTML = "";[span_271](start_span)[span_271](end_span)
  PROVIDERS.forEach((provider) => {[span_272](start_span)[span_272](end_span)
    const isEnabled = enabledProviders.includes(provider);[span_273](start_span)[span_273](end_span)
    const btn = document.createElement("button");[span_274](start_span)[span_274](end_span)
    btn.type = "button";[span_275](start_span)[span_275](end_span)
    btn.className = "provider-toggle" + (isEnabled ? " enabled" : "");[span_276](start_span)[span_276](end_span)
    btn.setAttribute("aria-pressed", String(isEnabled));[span_277](start_span)[span_277](end_span)
    btn.innerHTML =[span_278](start_span)[span_278](end_span)
      "<span>" + escapeHtml(provider) + "</span>" +[span_279](start_span)[span_279](end_span)
      '<span class="toggle-state">' + (isEnabled ? "Aktiv" : "Aus") + "</span>";[span_280](start_span)[span_280](end_span)
    btn.addEventListener("click", () => toggleProvider(provider));[span_281](start_span)[span_281](end_span)
    providerToggleGrid.append(btn);[span_282](start_span)[span_282](end_span)
  });[span_283](start_span)[span_283](end_span)
}

selectAllProvidersBtn.addEventListener("click", () => {[span_284](start_span)[span_284](end_span)
  enabledProviders = [...PROVIDERS];[span_285](start_span)[span_285](end_span)
  saveEnabledProviders();[span_286](start_span)[span_286](end_span)
});[span_287](start_span)[span_287](end_span)

selectMediathekenBtn.addEventListener("click", () => {[span_288](start_span)[span_288](end_span)
  enabledProviders = [...MEDIATHEK_FREE_PROVIDERS];[span_289](start_span)[span_289](end_span)
  saveEnabledProviders();[span_290](start_span)[span_290](end_span)
});[span_291](start_span)[span_291](end_span)

clearProvidersBtn.addEventListener("click", () => {[span_292](start_span)[span_292](end_span)
  enabledProviders = [];[span_293](start_span)[span_293](end_span)
  saveEnabledProviders();[span_294](start_span)[span_294](end_span)
});[span_295](start_span)[span_295](end_span)

function getApiKey() {[span_296](start_span)[span_296](end_span)
  return (localStorage.getItem(API_KEY_STORAGE) || "").trim();[span_297](start_span)[span_297](end_span)
}

function updateApiBadge() {[span_298](start_span)[span_298](end_span)
  const hasKey = Boolean(getApiKey());[span_299](start_span)[span_299](end_span)
  apiStatus.textContent = hasKey ? "Gemini aktiv" : "Demo-Modus";[span_300](start_span)[span_300](end_span)
  apiStatus.classList.toggle("active", hasKey);[span_301](start_span)[span_301](end_span)
}

function escapeHtml(str) {[span_302](start_span)[span_302](end_span)
  return String(str).replace(/[&<>"']/g, (m) => ({[span_303](start_span)[span_303](end_span)
    "&": "&amp;",[span_304](start_span)[span_304](end_span)
    "<": "&lt;",[span_305](start_span)[span_305](end_span)
    ">": "&gt;",[span_306](start_span)[span_306](end_span)
    '"': "&quot;",[span_307](start_span)[span_307](end_span)
    "'": "&#39;[span_308](start_span)"[span_308](end_span)
  }[m]));[span_309](start_span)[span_309](end_span)
}

function stripMarkdown(str) {[span_310](start_span)[span_310](end_span)
  return String(str).replace(/\*\*/g, "").replace(/\*/g, "").trim();[span_311](start_span)[span_311](end_span)
}

function normalizeProvider(raw) {[span_312](start_span)[span_312](end_span)
  if (!raw) return "Sonstiges";[span_313](start_span)[span_313](end_span)
  const match = PROVIDERS.find((p) => p.toLowerCase() === String(raw).trim().toLowerCase());[span_314](start_span)[span_314](end_span)
  return match || "Sonstiges";[span_315](start_span)[span_315](end_span)
}

function normalizeMediaType(raw, rec = {}) {[span_316](start_span)[span_316](end_span)
  const candidate = String(raw || rec.category || rec.format || "").trim().toLowerCase();[span_317](start_span)[span_317](end_span)
  if (/(serie|series|staffel|miniserie|show|tv-serie)/i.test(candidate)) {[span_318](start_span)[span_318](end_span)
    return "Serie";[span_319](start_span)[span_319](end_span)
  }
  if (/(film|movie|spielfilm|kinofilm|doku|dokumentation)/i.test(candidate)) {[span_320](start_span)[span_320](end_span)
    return candidate.includes("doku") ? "Doku" : "Film";[span_321](start_span)[span_321](end_span)
  }
  const runtimeStr = String(rec.runtime || "").toLowerCase();[span_322](start_span)[span_322](end_span)
  if (/staffel|folgen|episoden/i.test(runtimeStr)) {[span_323](start_span)[span_323](end_span)
    return "Serie";[span_324](start_span)[span_324](end_span)
  }
  return "Film";[span_325](start_span)[span_325](end_span)
}

function getRatingIcon(rating) {[span_326](start_span)[span_326](end_span)
  if (rating === "Finde ich super") return "👍👍";[span_327](start_span)[span_327](end_span)
  if (rating === "Gefällt mir") return "👍";[span_328](start_span)[span_328](end_span)
  if (rating === "Nicht gefällt mir") return "👎";[span_329](start_span)[span_329](end_span)
  return "";[span_330](start_span)[span_330](end_span)
}

function mapThumbsValueToRating(val) {[span_331](start_span)[span_331](end_span)
  const num = Number(String(val ?? "").trim());[span_332](start_span)[span_332](end_span)
  if (num === 1) return "Nicht gefällt mir";[span_333](start_span)[span_333](end_span)
  if (num === 2) return "Gefällt mir";[span_334](start_span)[span_334](end_span)
  if (num === 3) return "Finde ich super";[span_335](start_span)[span_335](end_span)
  return null;[span_336](start_span)[span_336](end_span)
}

function addToWatchlist(title, provider, rating = null, mediaType = null) {[span_337](start_span)[span_337](end_span)
  const cleanTitle = stripMarkdown(title);[span_338](start_span)[span_338](end_span)
  if (!cleanTitle) return;[span_339](start_span)[span_339](end_span)
  const resolvedType = mediaType || autoInferMediaType(cleanTitle) || null;[span_340](start_span)[span_340](end_span)
  items.unshift({[span_341](start_span)[span_341](end_span)
    id: crypto.randomUUID(),[span_342](start_span)[span_342](end_span)
    title: cleanTitle,[span_343](start_span)[span_343](end_span)
    type: resolvedType ? normalizeMediaType(resolvedType) : null,[span_344](start_span)[span_344](end_span)
    provider: normalizeProvider(provider),[span_345](start_span)[span_345](end_span)
    rating: RATINGS.includes(rating) ? rating : null[span_346](start_span)[span_346](end_span)
  });[span_347](start_span)[span_347](end_span)
  saveItems();[span_348](start_span)[span_348](end_span)
  renderList();[span_349](start_span)[span_349](end_span)
}

function setItemRating(item, nextRating) {[span_350](start_span)[span_350](end_span)
  const resolved = item.rating === nextRating ? null : nextRating;[span_351](start_span)[span_351](end_span)
  item.rating = resolved;[span_352](start_span)[span_352](end_span)
  const key = stripMarkdown(item.title || "").toLowerCase();[span_353](start_span)[span_353](end_span)
  if (key) {[span_354](start_span)[span_354](end_span)
    if (resolved) {[span_355](start_span)[span_355](end_span)
      seenRatings[key] = resolved;[span_356](start_span)[span_356](end_span)
    } else {[span_357](start_span)[span_357](end_span)
      delete seenRatings[key];[span_358](start_span)[span_358](end_span)
    }
    saveSeenRatings();[span_359](start_span)[span_359](end_span)
  }
  saveItems();[span_360](start_span)[span_360](end_span)
  renderList();[span_361](start_span)[span_361](end_span)
  renderSeenList();[span_362](start_span)[span_362](end_span)
}

function createRatingControls(currentRating, onSelect) {[span_363](start_span)[span_363](end_span)
  const group = document.createElement("div");[span_364](start_span)[span_364](end_span)
  group.className = "rating-group";[span_365](start_span)[span_365](end_span)

  const configs = [[span_366](start_span)[span_366](end_span)
    { value: "Nicht gefällt mir", icon: "👎", label: "Nicht gefällt mir", activeClass: "selected-dislike" },[span_367](start_span)[span_367](end_span)
    { value: "Gefällt mir", icon: "👍", label: "Gefällt mir", activeClass: "selected-like" },[span_368](start_span)[span_368](end_span)
    { value: "Finde ich super", icon: "👍👍", label: "Finde ich super", activeClass: "selected-super" }[span_369](start_span)[span_369](end_span)
  ];[span_370](start_span)[span_370](end_span)

  configs.forEach((cfg) => {[span_371](start_span)[span_371](end_span)
    const btn = document.createElement("button");[span_372](start_span)[span_372](end_span)
    btn.type = "button";[span_373](start_span)[span_373](end_span)
    btn.className = "rate-btn";[span_374](start_span)[span_374](end_span)
    if (currentRating === cfg.value) {[span_375](start_span)[span_375](end_span)
      btn.classList.add(cfg.activeClass);[span_376](start_span)[span_376](end_span)
    }
    btn.textContent = cfg.icon;[span_377](start_span)[span_377](end_span)
    btn.title = cfg.label;[span_378](start_span)[span_378](end_span)
    btn.setAttribute("aria-label", cfg.label);[span_379](start_span)[span_379](end_span)
    btn.addEventListener("click", () => onSelect(cfg.value));[span_380](start_span)[span_380](end_span)
    group.append(btn);[span_381](start_span)[span_381](end_span)
  });[span_382](start_span)[span_382](end_span)

  return group;[span_383](start_span)[span_383](end_span)
}

function renderSeenList() {[span_384](start_span)[span_384](end_span)
  if (seenCountEl) {[span_385](start_span)[span_385](end_span)
    seenCountEl.textContent = String(seenEntries.length);[span_386](start_span)[span_386](end_span)
  }
  const selectedRating = seenRatingFilter ? seenRatingFilter.value : "Alle";[span_387](start_span)[span_387](end_span)
  const selectedType = seenTypeFilter ? seenTypeFilter.value : "Alle";[span_388](start_span)[span_388](end_span)

  const filtered = seenEntries.filter((entry) => {[span_389](start_span)[span_389](end_span)
    const rating = getTitleRating(entry.title);[span_390](start_span)[span_390](end_span)
    if (selectedRating === "Ohne Bewertung" && rating) return false;[span_391](start_span)[span_391](end_span)
    if (selectedRating !== "Alle" && selectedRating !== "Ohne Bewertung" && rating !== selectedRating) {[span_392](start_span)[span_392](end_span)
      return false;[span_393](start_span)[span_393](end_span)
    }

    if (selectedType === "Ohne Typ" && entry.type) return false;[span_394](start_span)[span_394](end_span)
    if (selectedType !== "Alle" && selectedType !== "Ohne Typ" && entry.type !== selectedType) {[span_395](start_span)[span_395](end_span)
      return false;[span_396](start_span)[span_396](end_span)
    }

    return true;[span_397](start_span)[span_397](end_span)
  });[span_398](start_span)[span_398](end_span)

  seenContainer.innerHTML = "";[span_399](start_span)[span_399](end_span)
  if (filtered.length === 0) {[span_400](start_span)[span_400](end_span)
    seenContainer.innerHTML = '<div class="meta">Keine gesehenen Titel für den gewählten Filter vorhanden.</div>';[span_401](start_span)[span_401](end_span)
    return;[span_402](start_span)[span_402](end_span)
  }

  filtered.forEach((entry) => {[span_403](start_span)[span_403](end_span)
    const currentRating = getTitleRating(entry.title);[span_404](start_span)[span_404](end_span)
    const div = document.createElement("div");[span_405](start_span)[span_405](end_span)
    div.className = "item";[span_406](start_span)[span_406](end_span)

    const typeBadge = entry.type[span_407](start_span)[span_407](end_span)
      ? '<span class="type-pill">' + escapeHtml(entry.type) + "</span>[span_408](start_span)"[span_408](end_span)
      : '<span class="type-pill" style="opacity:0.65;">Kein Typ</span>';[span_409](start_span)[span_409](end_span)
    const ratingBadge = currentRating[span_410](start_span)[span_410](end_span)
      ? '<span class="rating-pill">' + escapeHtml(getRatingIcon(currentRating) + " " + currentRating) + "</span>[span_411](start_span)"[span_411](end_span)
      : "";[span_412](start_span)[span_412](end_span)

    const info = document.createElement("div");[span_413](start_span)[span_413](end_span)
    info.innerHTML =[span_414](start_span)[span_414](end_span)
      "<div>" +[span_415](start_span)[span_415](end_span)
        "<strong>" + escapeHtml(entry.title) + "</strong>" +[span_416](start_span)[span_416](end_span)
        typeBadge +[span_417](start_span)[span_417](end_span)
        ratingBadge +[span_418](start_span)[span_418](end_span)
      "</div>";[span_419](start_span)[span_419](end_span)

    const typeBtn = document.createElement("button");[span_420](start_span)[span_420](end_span)
    typeBtn.type = "button";[span_421](start_span)[span_421](end_span)
    typeBtn.className = "secondary";[span_422](start_span)[span_422](end_span)
    typeBtn.textContent = entry.type ? "Typ: " + entry.type : "Typ setzen";[span_423](start_span)[span_423](end_span)
    typeBtn.title = "Zwischen Serie, Film und ohne Typ wechseln";[span_424](start_span)[span_424](end_span)
    typeBtn.setAttribute("aria-label", "Typ wechseln für " + entry.title);[span_425](start_span)[span_425](end_span)
    typeBtn.addEventListener("click", () => {[span_426](start_span)[span_426](end_span)
      cycleSeenEntryType(entry.title);[span_427](start_span)[span_427](end_span)
      renderSeenList();[span_428](start_span)[span_428](end_span)
    });[span_429](start_span)[span_429](end_span)

    const ratingControls = createRatingControls(currentRating, (clickedRating) => {[span_430](start_span)[span_430](end_span)
      const next = currentRating === clickedRating ? null : clickedRating;[span_431](start_span)[span_431](end_span)
      setTitleRating(entry.title, next);[span_432](start_span)[span_432](end_span)
      renderSeenList();[span_433](start_span)[span_433](end_span)
      renderList();[span_434](start_span)[span_434](end_span)
    });[span_435](start_span)[span_435](end_span)

    const actions = document.createElement("div");[span_436](start_span)[span_436](end_span)
    actions.className = "actions";[span_437](start_span)[span_437](end_span)

    const removeBtn = document.createElement("button");[span_438](start_span)[span_438](end_span)
    removeBtn.type = "button";[span_439](start_span)[span_439](end_span)
    removeBtn.className = "unseen-btn";[span_440](start_span)[span_440](end_span)
    removeBtn.textContent = "✕";[span_441](start_span)[span_441](end_span)
    removeBtn.title = "Markierung entfernen";[span_442](start_span)[span_442](end_span)
    removeBtn.setAttribute("aria-label", "Markierung entfernen");[span_443](start_span)[span_443](end_span)
    removeBtn.addEventListener("click", () => {[span_444](start_span)[span_444](end_span)
      removeSeenEntry(entry.title);[span_445](start_span)[span_445](end_span)
      renderSeenList();[span_446](start_span)[span_446](end_span)
      renderList();[span_447](start_span)[span_447](end_span)
    });[span_448](start_span)[span_448](end_span)

    actions.append(typeBtn, ratingControls, removeBtn);[span_449](start_span)[span_449](end_span)
    div.append(info, actions);[span_450](start_span)[span_450](end_span)
    seenContainer.append(div);[span_451](start_span)[span_451](end_span)
  });[span_452](start_span)[span_452](end_span)
}

function renderList() {[span_453](start_span)[span_453](end_span)
  if (watchlistCountEl) {[span_454](start_span)[span_454](end_span)
    watchlistCountEl.textContent = String(items.length);[span_455](start_span)[span_455](end_span)
  }
  const selectedProvider = providerFilter.value;[span_456](start_span)[span_456](end_span)
  const selectedRating = ratingFilter.value;[span_457](start_span)[span_457](end_span)

  const filtered = items.filter((item) => {[span_458](start_span)[span_458](end_span)
    const providerMatch = selectedProvider === "Alle" || item.provider === selectedProvider;[span_459](start_span)[span_459](end_span)
    let ratingMatch = true;[span_460](start_span)[span_460](end_span)
    if (selectedRating === "Ohne Bewertung") {[span_461](start_span)[span_461](end_span)
      ratingMatch = !item.rating;[span_462](start_span)[span_462](end_span)
    } else if (selectedRating !== "Alle") {[span_463](start_span)[span_463](end_span)
      ratingMatch = item.rating === selectedRating;[span_464](start_span)[span_464](end_span)
    }
    return providerMatch && ratingMatch;[span_465](start_span)[span_465](end_span)
  });[span_466](start_span)[span_466](end_span)

  watchlistContainer.innerHTML = "";[span_467](start_span)[span_467](end_span)
  if (filtered.length === 0) {[span_468](start_span)[span_468](end_span)
    watchlistContainer.innerHTML = '<div class="meta">Keine Einträge für den gewählten Filter vorhanden.</div>';[span_469](start_span)[span_469](end_span)
    return;[span_470](start_span)[span_470](end_span)
  }

  filtered.forEach((item) => {[span_471](start_span)[span_471](end_span)
    const providerName = PROVIDERS.includes(item.provider) ? item.provider : "Sonstiges";[span_472](start_span)[span_472](end_span)
    const currentRating = RATINGS.includes(item.rating) ? item.rating : null;[span_473](start_span)[span_473](end_span)
    const typeBadge = item.type[span_474](start_span)[span_474](end_span)
      ? '<span class="type-pill">' + escapeHtml(item.type) + "</span>[span_475](start_span)"[span_475](end_span)
      : "";[span_476](start_span)[span_476](end_span)

    const div = document.createElement("div");[span_477](start_span)[span_477](end_span)
    div.className = "item";[span_478](start_span)[span_478](end_span)

    const info = document.createElement("div");[span_479](start_span)[span_479](end_span)
    const ratingBadge = currentRating[span_480](start_span)[span_480](end_span)
      ? '<span class="rating-pill">' + escapeHtml(getRatingIcon(currentRating) + " " + currentRating) + "</span>[span_481](start_span)"[span_481](end_span)
      : "";[span_482](start_span)[span_482](end_span)
    info.innerHTML =[span_483](start_span)[span_483](end_span)
      "<div>" +[span_484](start_span)[span_484](end_span)
        "<strong>" + escapeHtml(item.title) + "</strong>" +[span_485](start_span)[span_485](end_span)
        typeBadge +[span_486](start_span)[span_486](end_span)
        '<span class="provider-pill">' + escapeHtml(providerName) + "</span>" +[span_487](start_span)[span_487](end_span)
        ratingBadge +[span_488](start_span)[span_488](end_span)
      "</div>";[span_489](start_span)[span_489](end_span)

    const ratingControls = createRatingControls(currentRating, (nextRating) => {[span_490](start_span)[span_490](end_span)
      setItemRating(item, nextRating);[span_491](start_span)[span_491](end_span)
    });[span_492](start_span)[span_492](end_span)

    const actions = document.createElement("div");[span_493](start_span)[span_493](end_span)
    actions.className = "actions";[span_494](start_span)[span_494](end_span)

    const seenBtn = document.createElement("button");[span_495](start_span)[span_495](end_span)
    seenBtn.type = "button";[span_496](start_span)[span_496](end_span)
    seenBtn.className = "seen-btn";[span_497](start_span)[span_497](end_span)
    seenBtn.textContent = "✓ Gesehen";[span_498](start_span)[span_498](end_span)
    seenBtn.title = "Als gesehen markieren und aus der Merkliste entfernen";[span_499](start_span)[span_499](end_span)
    seenBtn.setAttribute("aria-label", "Als gesehen markieren und aus der Merkliste entfernen");[span_500](start_span)[span_500](end_span)
    seenBtn.addEventListener("click", () => {[span_501](start_span)[span_501](end_span)
      markTitleAsSeen(item.title, item.type);[span_502](start_span)[span_502](end_span)
    });[span_503](start_span)[span_503](end_span)

    const delBtn = document.createElement("button");[span_504](start_span)[span_504](end_span)
    delBtn.type = "button";[span_505](start_span)[span_505](end_span)
    delBtn.className = "unseen-btn";[span_506](start_span)[span_506](end_span)
    delBtn.textContent = "✕";[span_507](start_span)[span_507](end_span)
    delBtn.title = "Aus Merkliste löschen";[span_508](start_span)[span_508](end_span)
    delBtn.setAttribute("aria-label", "Aus Merkliste löschen");[span_509](start_span)[span_509](end_span)
    delBtn.addEventListener("click", () => {[span_510](start_span)[span_510](end_span)
      items = items.filter((entry) => entry.id !== item.id);[span_511](start_span)[span_511](end_span)
      saveItems();[span_512](start_span)[span_512](end_span)
      renderList();[span_513](start_span)[span_513](end_span)
    });[span_514](start_span)[span_514](end_span)

    actions.append(ratingControls, seenBtn, delBtn);[span_515](start_span)[span_515](end_span)
    div.append(info, actions);[span_516](start_span)[span_516](end_span)
    watchlistContainer.append(div);[span_517](start_span)[span_517](end_span)
  });[span_518](start_span)[span_518](end_span)
}

function parseDurationToSeconds(durationStr) {[span_519](start_span)[span_519](end_span)
  const parts = String(durationStr || "").trim().split(":");[span_520](start_span)[span_520](end_span)
  if (parts.length === 3) {[span_521](start_span)[span_521](end_span)
    const h = Number(parts[0]);[span_522](start_span)[span_522](end_span)
    const m = Number(parts[1]);[span_523](start_span)[span_523](end_span)
    const s = Number(parts[2]);[span_524](start_span)[span_524](end_span)
    if ([h, m, s].every(Number.isFinite)) {[span_525](start_span)[span_525](end_span)
      return h * 3600 + m * 60 + s;[span_526](start_span)[span_526](end_span)
    }
  }
  return 0;[span_527](start_span)[span_527](end_span)
}

function parseCsvRows(rawText) {[span_528](start_span)[span_528](end_span)
  const cleanText = rawText.replace(/^\uFEFF/, "");[span_529](start_span)[span_529](end_span)
  const firstLine = cleanText.split(/\r?\n/)[0] || "";[span_530](start_span)[span_530](end_span)
  const commaCount = (firstLine.match(/,/g) || []).length;[span_531](start_span)[span_531](end_span)
  const semiCount = (firstLine.match(/;/g) || []).length;[span_532](start_span)[span_532](end_span)
  const delimiter = semiCount > commaCount ? ";" : ",";[span_533](start_span)[span_533](end_span)

  const rows = [];[span_534](start_span)[span_534](end_span)
  let currentRow = [];[span_535](start_span)[span_535](end_span)
  let currentField = "";[span_536](start_span)[span_536](end_span)
  let inQuotes = false;[span_537](start_span)[span_537](end_span)

  for (let i = 0; i < cleanText.length; i++) {[span_538](start_span)[span_538](end_span)
    const ch = cleanText[i];[span_539](start_span)[span_539](end_span)
    const next = cleanText[i + 1];[span_540](start_span)[span_540](end_span)

    if (inQuotes) {[span_541](start_span)[span_541](end_span)
      if (ch === '"' && next === '"') {[span_542](start_span)[span_542](end_span)
        currentField += '"';[span_543](start_span)[span_543](end_span)
        i++;[span_544](start_span)[span_544](end_span)
      } else if (ch === '"') {[span_545](start_span)[span_545](end_span)
        inQuotes = false;[span_546](start_span)[span_546](end_span)
      } else {[span_547](start_span)[span_547](end_span)
        currentField += ch;[span_548](start_span)[span_548](end_span)
      }
    } else if (ch === '"') {[span_549](start_span)[span_549](end_span)
      inQuotes = true;[span_550](start_span)[span_550](end_span)
    } else if (ch === delimiter) {[span_551](start_span)[span_551](end_span)
      currentRow.push(currentField);[span_552](start_span)[span_552](end_span)
      currentField = "";[span_553](start_span)[span_553](end_span)
    } else if (ch === "\r" && next === "\n") {[span_554](start_span)[span_554](end_span)
      currentRow.push(currentField);[span_555](start_span)[span_555](end_span)
      rows.push(currentRow);[span_556](start_span)[span_556](end_span)
      currentRow = [];[span_557](start_span)[span_557](end_span)
      currentField = "";[span_558](start_span)[span_558](end_span)
      i++;[span_559](start_span)[span_559](end_span)
    } else if (ch === "\n" || ch === "\r") {[span_560](start_span)[span_560](end_span)
      currentRow.push(currentField);[span_561](start_span)[span_561](end_span)
      rows.push(currentRow);[span_562](start_span)[span_562](end_span)
      currentRow = [];[span_563](start_span)[span_563](end_span)
      currentField = "";[span_564](start_span)[span_564](end_span)
    } else {[span_565](start_span)[span_565](end_span)
      currentField += ch;[span_566](start_span)[span_566](end_span)
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {[span_567](start_span)[span_567](end_span)
    currentRow.push(currentField);[span_568](start_span)[span_568](end_span)
    rows.push(currentRow);[span_569](start_span)[span_569](end_span)
  }

  if (rows.length < 2) return [];[span_570](start_span)[span_570](end_span)
  const headers = rows[0].map((h) => h.trim());[span_571](start_span)[span_571](end_span)
  return rows[span_572](start_span)[span_572](end_span)
    .slice(1)[span_573](start_span)[span_573](end_span)
    .filter((r) => r.some((cell) => String(cell).trim() !== ""))[span_574](start_span)[span_574](end_span)
    .map((r) => {[span_575](start_span)[span_575](end_span)
      const obj = {};[span_576](start_span)[span_576](end_span)
      headers.forEach((h, idx) => {[span_577](start_span)[span_577](end_span)
        obj[h] = r[idx] !== undefined ? r[idx] : "";[span_578](start_span)[span_578](end_span)
      });[span_579](start_span)[span_579](end_span)
      return obj;[span_580](start_span)[span_580](end_span)
    });[span_581](start_span)[span_581](end_span)
}

function mapNetflixViewingRow(row, minSeconds) {[span_582](start_span)[span_582](end_span)
  const supp = String(row["Supplemental Video Type"] || "").trim();[span_583](start_span)[span_583](end_span)
  if (supp && supp.toUpperCase() !== "NAN") {[span_584](start_span)[span_584](end_span)
    return null;[span_585](start_span)[span_585](end_span)
  }

  const seconds = parseDurationToSeconds(row["Duration"]);[span_586](start_span)[span_586](end_span)
  if (seconds < minSeconds) {[span_587](start_span)[span_587](end_span)
    return null;[span_588](start_span)[span_588](end_span)
  }

  const rawTitle = stripMarkdown(String(row["Title"] || "").trim());[span_589](start_span)[span_589](end_span)
  if (!rawTitle) {[span_590](start_span)[span_590](end_span)
    return null;[span_591](start_span)[span_591](end_span)
  }

  if (/^(trailer|teaser|clip\b)/i.test(rawTitle)) {[span_592](start_span)[span_592](end_span)
    return null;[span_593](start_span)[span_593](end_span)
  }

  const seriesMatch = rawTitle.match([span_594](start_span)[span_594](end_span)
    /^(.+?):\s*(?:Staffel\s+\d+|Miniserie|Season\s+\d+|Limited Series|Ausgabe\s+\d+|\d+\s*:)/i[span_595](start_span)[span_595](end_span)
  );[span_596](start_span)[span_596](end_span)
  if (seriesMatch) {[span_597](start_span)[span_597](end_span)
    return { title: seriesMatch[1].trim(), type: "Serie" };[span_598](start_span)[span_598](end_span)
  }

  if (/\((?:Folge|Episode)\s+\d+\)\s*$/i.test(rawTitle) && rawTitle.includes(":")) {[span_599](start_span)[span_599](end_span)
    return { title: rawTitle.split(":", 1)[0].trim(), type: "Serie" };[span_600](start_span)[span_600](end_span)
  }

  return { title: rawTitle, type: "Film" };[span_601](start_span)[span_601](end_span)
}

function parseNetflixCsvToEntries(rawText, minSeconds) {[span_602](start_span)[span_602](end_span)
  const records = parseCsvRows(rawText);[span_603](start_span)[span_603](end_span)
  if (records.length === 0 || !("Title" in records[0])) {[span_604](start_span)[span_604](end_span)
    throw new Error("CSV enthält keine gültige 'Title'-Spalte (ViewingActivity.csv erwartet).");[span_605](start_span)[span_605](end_span)
  }

  const deduped = new Map();[span_606](start_span)[span_606](end_span)
  for (const row of records) {[span_607](start_span)[span_607](end_span)
    const mapped = mapNetflixViewingRow(row, minSeconds);[span_608](start_span)[span_608](end_span)
    if (!mapped) continue;[span_609](start_span)[span_609](end_span)
    const key = mapped.title.toLowerCase();[span_610](start_span)[span_610](end_span)
    if (!deduped.has(key)) {[span_611](start_span)[span_611](end_span)
      deduped.set(key, { title: mapped.title, type: mapped.type });[span_612](start_span)[span_612](end_span)
    } else if (mapped.type === "Serie") {[span_613](start_span)[span_613](end_span)
      deduped.get(key).type = "Serie";[span_614](start_span)[span_614](end_span)
    }
  }
  return Array.from(deduped.values());[span_615](start_span)[span_615](end_span)
}

function parseSeenImportPayload(rawText, minSeconds) {[span_616](start_span)[span_616](end_span)
  const trimmed = rawText.trim();[span_617](start_span)[span_617](end_span)
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {[span_618](start_span)[span_618](end_span)
    const parsed = JSON.parse(trimmed);[span_619](start_span)[span_619](end_span)
    const list = Array.isArray(parsed)[span_620](start_span)[span_620](end_span)
      ? parsed[span_621](start_span)[span_621](end_span)
      : Array.isArray(parsed?.seenEntries)[span_622](start_span)[span_622](end_span)
        ? parsed.seenEntries[span_623](start_span)[span_623](end_span)
        : null;[span_624](start_span)[span_624](end_span)

    if (!list) {[span_625](start_span)[span_625](end_span)
      throw new Error("JSON muss ein Array aus { title, type } oder Strings sein.");[span_626](start_span)[span_626](end_span)
    }

    return list[span_627](start_span)[span_627](end_span)
      .map((entry) => {[span_628](start_span)[span_628](end_span)
        if (typeof entry === "string") {[span_629](start_span)[span_629](end_span)
          const title = stripMarkdown(entry);[span_630](start_span)[span_630](end_span)
          return title ? { title, type: autoInferMediaType(title) } : null;[span_631](start_span)[span_631](end_span)
        }
        if (entry && typeof entry === "object" && entry.title) {[span_632](start_span)[span_632](end_span)
          const title = stripMarkdown(entry.title);[span_633](start_span)[span_633](end_span)
          const resolvedType = entry.type ? normalizeMediaType(entry.type) : autoInferMediaType(title);[span_634](start_span)[span_634](end_span)
          return title ? { title, type: resolvedType } : null;[span_635](start_span)[span_635](end_span)
        }
        return null;[span_636](start_span)[span_636](end_span)
      })[span_637](start_span)[span_637](end_span)
      .filter(Boolean);[span_638](start_span)[span_638](end_span)
  }

  return parseNetflixCsvToEntries(trimmed, minSeconds);[span_639](start_span)[span_639](end_span)
}

function parseNetflixRatingsPayload(rawText) {[span_640](start_span)[span_640](end_span)
  const trimmed = rawText.trim();[span_641](start_span)[span_641](end_span)
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {[span_642](start_span)[span_642](end_span)
    const parsed = JSON.parse(trimmed);[span_643](start_span)[span_643](end_span)
    const list = Array.isArray(parsed)[span_644](start_span)[span_644](end_span)
      ? parsed[span_645](start_span)[span_645](end_span)
      : Array.isArray(parsed?.ratings)[span_646](start_span)[span_646](end_span)
        ? parsed.ratings[span_647](start_span)[span_647](end_span)
        : null;[span_648](start_span)[span_648](end_span)
    if (!list) {[span_649](start_span)[span_649](end_span)
      throw new Error("JSON muss ein Array aus { title, rating } sein.");[span_650](start_span)[span_650](end_span)
    }
    const map = new Map();[span_651](start_span)[span_651](end_span)
    list.forEach((entry) => {[span_652](start_span)[span_652](end_span)
      const title = stripMarkdown(entry?.title || entry?.["Title Name"] || "");[span_653](start_span)[span_653](end_span)
      const rating = RATINGS.includes(entry?.rating)[span_654](start_span)[span_654](end_span)
        ? entry.rating[span_655](start_span)[span_655](end_span)
        : mapThumbsValueToRating(entry?.thumbsValue ?? entry?.["Thumbs Value"]);[span_656](start_span)[span_656](end_span)
      const type = entry?.type ? normalizeMediaType(entry.type) : autoInferMediaType(title);[span_657](start_span)[span_657](end_span)
      if (title && rating) {[span_658](start_span)[span_658](end_span)
        map.set(title.toLowerCase(), { title, rating, type });[span_659](start_span)[span_659](end_span)
      }
    });[span_660](start_span)[span_660](end_span)
    return Array.from(map.values());[span_661](start_span)[span_661](end_span)
  }

  const records = parseCsvRows(trimmed);[span_662](start_span)[span_662](end_span)
  if (records.length === 0 || !("Title Name" in records[0])) {[span_663](start_span)[span_663](end_span)
    throw new Error("CSV enthält keine gültige 'Title Name'-Spalte (Ratings.csv erwartet).");[span_664](start_span)[span_664](end_span)
  }

  const sortable = records.map((r, idx) => {[span_665](start_span)[span_665](end_span)
    const tsRaw = String(r["Event Utc Ts"] || "").trim();[span_666](start_span)[span_666](end_span)
    const tsMs = tsRaw ? Date.parse(tsRaw.replace(" ", "T") + (tsRaw.endsWith("Z") ? "" : "Z")) : NaN;[span_667](start_span)[span_667](end_span)
    return { row: r, idx, tsMs: Number.isFinite(tsMs) ? tsMs : idx };[span_668](start_span)[span_668](end_span)
  });[span_669](start_span)[span_669](end_span)
  sortable.sort((a, b) => a.tsMs - b.tsMs || a.idx - b.idx);[span_670](start_span)[span_670](end_span)

  const byTitle = new Map();[span_671](start_span)[span_671](end_span)
  for (const item of sortable) {[span_672](start_span)[span_672](end_span)
    const r = item.row;[span_673](start_span)[span_673](end_span)
    const title = stripMarkdown(String(r["Title Name"] || "").trim());[span_674](start_span)[span_674](end_span)
    if (!title) continue;[span_675](start_span)[span_675](end_span)
    const rating = mapThumbsValueToRating(r["Thumbs Value"]);[span_676](start_span)[span_676](end_span)
    if (!rating) continue;[span_677](start_span)[span_677](end_span)
    byTitle.set(title.toLowerCase(), { title, rating, type: autoInferMediaType(title) });[span_678](start_span)[span_678](end_span)
  }
  return Array.from(byTitle.values());[span_679](start_span)[span_679](end_span)
}

if (seenImportFileInput) {[span_680](start_span)[span_680](end_span)
  seenImportFileInput.addEventListener("change", async (event) => {[span_681](start_span)[span_681](end_span)
    const file = event.target.files?.[0];[span_682](start_span)[span_682](end_span)
    if (!file) return;[span_683](start_span)[span_683](end_span)
    try {[span_684](start_span)[span_684](end_span)
      const text = await file.text();[span_685](start_span)[span_685](end_span)
      if (seenImportTextarea) seenImportTextarea.value = text;[span_686](start_span)[span_686](end_span)
      if (seenImportStatus) {[span_687](start_span)[span_687](end_span)
        seenImportStatus.textContent = `Datei „${file.name}“ geladen. Jetzt auf „Gesehen-Liste importieren“ klicken.`;[span_688](start_span)[span_688](end_span)
      }
      debugLog(`Gesehen-Importdatei geladen: ${file.name} (${file.size} Bytes).`);[span_689](start_span)[span_689](end_span)
    } catch (err) {[span_690](start_span)[span_690](end_span)
      const msg = "Fehler beim Lesen der Datei: " + (err?.message || String(err));[span_691](start_span)[span_691](end_span)
      if (seenImportStatus) seenImportStatus.textContent = msg;[span_692](start_span)[span_692](end_span)
      debugLog(msg);[span_693](start_span)[span_693](end_span)
    }
  });[span_694](start_span)[span_694](end_span)
}

if (importSeenBtn) {[span_695](start_span)[span_695](end_span)
  importSeenBtn.addEventListener("click", () => {[span_696](start_span)[span_696](end_span)
    const rawText = (seenImportTextarea?.value || "").trim();[span_697](start_span)[span_697](end_span)
    if (!rawText) {[span_698](start_span)[span_698](end_span)
      if (seenImportStatus) seenImportStatus.textContent = "Bitte zuerst ViewingActivity.csv / JSON einfügen oder eine Datei wählen.";[span_699](start_span)[span_699](end_span)
      return;[span_700](start_span)[span_700](end_span)
    }

    const minSecondsRaw = Number(seenMinSecondsInput?.value ?? DEFAULT_SEEN_MIN_SECONDS);[span_701](start_span)[span_701](end_span)
    const minSeconds = Number.isFinite(minSecondsRaw) && minSecondsRaw >= 0 ? minSecondsRaw : DEFAULT_SEEN_MIN_SECONDS;[span_702](start_span)[span_702](end_span)

    try {[span_703](start_span)[span_703](end_span)
      const incoming = parseSeenImportPayload(rawText, minSeconds);[span_704](start_span)[span_704](end_span)
      if (incoming.length === 0) {[span_705](start_span)[span_705](end_span)
        if (seenImportStatus) seenImportStatus.textContent = "Keine passenden Titel nach Filterung gefunden.";[span_706](start_span)[span_706](end_span)
        return;[span_707](start_span)[span_707](end_span)
      }

      if (replaceSeenToggle?.checked) {[span_708](start_span)[span_708](end_span)
        seenEntries = [];[span_709](start_span)[span_709](end_span)
        saveSeenEntries();[span_710](start_span)[span_710](end_span)
      }

      let addedCount = 0;[span_711](start_span)[span_711](end_span)
      let updatedCount = 0;[span_712](start_span)[span_712](end_span)

      incoming.forEach((entry) => {[span_713](start_span)[span_713](end_span)
        const idx = findSeenIndex(entry.title);[span_714](start_span)[span_714](end_span)
        if (idx === -1) {[span_715](start_span)[span_715](end_span)
          addSeenEntry(entry.title, entry.type);[span_716](start_span)[span_716](end_span)
          addedCount += 1;[span_717](start_span)[span_717](end_span)
        } else if (entry.type && !seenEntries[idx].type) {[span_718](start_span)[span_718](end_span)
          seenEntries[idx].type = entry.type;[span_719](start_span)[span_719](end_span)
          updatedCount += 1;[span_720](start_span)[span_720](end_span)
        }
      });[span_721](start_span)[span_721](end_span)

      saveSeenEntries();[span_722](start_span)[span_722](end_span)
      renderSeenList();[span_723](start_span)[span_723](end_span)

      const summary = `Import abgeschlossen (ab ${minSeconds}s): ${addedCount} neu hinzugefügt, ${updatedCount} Typ ergänzt (Gesamt: ${seenEntries.length}).`;[span_724](start_span)[span_724](end_span)
      if (seenImportStatus) seenImportStatus.textContent = summary;[span_725](start_span)[span_725](end_span)
      debugLog(summary);[span_726](start_span)[span_726](end_span)
    } catch (err) {[span_727](start_span)[span_727](end_span)
      const msg = "Import fehlgeschlagen: " + (err?.message || String(err));[span_728](start_span)[span_728](end_span)
      if (seenImportStatus) seenImportStatus.textContent = msg;[span_729](start_span)[span_729](end_span)
      debugLog(msg);[span_730](start_span)[span_730](end_span)
    }
  });[span_731](start_span)[span_731](end_span)
}

if (clearSeenImportInputBtn) {[span_732](start_span)[span_732](end_span)
  clearSeenImportInputBtn.addEventListener("click", () => {[span_733](start_span)[span_733](end_span)
    if (seenImportTextarea) seenImportTextarea.value = "";[span_734](start_span)[span_734](end_span)
    if (seenImportFileInput) seenImportFileInput.value = "";[span_735](start_span)[span_735](end_span)
    if (seenImportStatus) seenImportStatus.textContent = "Eingabe geleert.";[span_736](start_span)[span_736](end_span)
  });[span_737](start_span)[span_737](end_span)
}

if (ratingsImportFileInput) {[span_738](start_span)[span_738](end_span)
  ratingsImportFileInput.addEventListener("change", async (event) => {[span_739](start_span)[span_739](end_span)
    const file = event.target.files?.[0];[span_740](start_span)[span_740](end_span)
    if (!file) return;[span_741](start_span)[span_741](end_span)
    try {[span_742](start_span)[span_742](end_span)
      const text = await file.text();[span_743](start_span)[span_743](end_span)
      if (ratingsImportTextarea) ratingsImportTextarea.value = text;[span_744](start_span)[span_744](end_span)
      if (ratingsImportStatus) {[span_745](start_span)[span_745](end_span)
        ratingsImportStatus.textContent = `Datei „${file.name}“ geladen. Jetzt auf „Bewertungen importieren“ klicken.`;[span_746](start_span)[span_746](end_span)
      }
      debugLog(`Bewertungs-Importdatei geladen: ${file.name} (${file.size} Bytes).`);[span_747](start_span)[span_747](end_span)
    } catch (err) {[span_748](start_span)[span_748](end_span)
      const msg = "Fehler beim Lesen der Bewertungsdatei: " + (err?.message || String(err));[span_749](start_span)[span_749](end_span)
      if (ratingsImportStatus) ratingsImportStatus.textContent = msg;[span_750](start_span)[span_750](end_span)
      debugLog(msg);[span_751](start_span)[span_751](end_span)
    }
  });[span_752](start_span)[span_752](end_span)
}

if (importRatingsBtn) {[span_753](start_span)[span_753](end_span)
  importRatingsBtn.addEventListener("click", () => {[span_754](start_span)[span_754](end_span)
    const rawText = (ratingsImportTextarea?.value || "").trim();[span_755](start_span)[span_755](end_span)
    if (!rawText) {[span_756](start_span)[span_756](end_span)
      if (ratingsImportStatus) ratingsImportStatus.textContent = "Bitte zuerst Ratings.csv / JSON einfügen oder eine Datei wählen.";[span_757](start_span)[span_757](end_span)
      return;[span_758](start_span)[span_758](end_span)
    }

    try {[span_759](start_span)[span_759](end_span)
      const parsedRatings = parseNetflixRatingsPayload(rawText);[span_760](start_span)[span_760](end_span)
      if (parsedRatings.length === 0) {[span_761](start_span)[span_761](end_span)
        if (ratingsImportStatus) ratingsImportStatus.textContent = "Keine gültigen Bewertungen im Inhalt gefunden.";[span_762](start_span)[span_762](end_span)
        return;[span_763](start_span)[span_763](end_span)
      }

      let ratingSavedCount = 0;[span_764](start_span)[span_764](end_span)
      let addedToSeenCount = 0;[span_765](start_span)[span_765](end_span)
      let watchlistUpdatedCount = 0;[span_766](start_span)[span_766](end_span)
      const shouldAddToSeen = Boolean(addRatedToSeenToggle?.checked);[span_767](start_span)[span_767](end_span)

      parsedRatings.forEach(({ title, rating, type }) => {[span_768](start_span)[span_768](end_span)
        const key = title.toLowerCase();[span_769](start_span)[span_769](end_span)
        seenRatings[key] = rating;[span_770](start_span)[span_770](end_span)
        ratingSavedCount += 1;[span_771](start_span)[span_771](end_span)

        items.forEach((it) => {[span_772](start_span)[span_772](end_span)
          if (stripMarkdown(it.title || "").toLowerCase() === key) {[span_773](start_span)[span_773](end_span)
            it.rating = rating;[span_774](start_span)[span_774](end_span)
            watchlistUpdatedCount += 1;[span_775](start_span)[span_775](end_span)
          }
        });[span_776](start_span)[span_776](end_span)

        const existingSeenIdx = findSeenIndex(title);[span_777](start_span)[span_777](end_span)
        if (existingSeenIdx !== -1 && type && !seenEntries[existingSeenIdx].type) {[span_778](start_span)[span_778](end_span)
          seenEntries[existingSeenIdx].type = type;[span_779](start_span)[span_779](end_span)
        } else if (existingSeenIdx === -1 && shouldAddToSeen) {[span_780](start_span)[span_780](end_span)
          addSeenEntry(title, type || inferKnownTypeForTitle(title));[span_781](start_span)[span_781](end_span)
          addedToSeenCount += 1;[span_782](start_span)[span_782](end_span)
        }
      });[span_783](start_span)[span_783](end_span)

      saveSeenRatings();[span_784](start_span)[span_784](end_span)
      saveSeenEntries();[span_785](start_span)[span_785](end_span)
      saveItems();[span_786](start_span)[span_786](end_span)
      renderSeenList();[span_787](start_span)[span_787](end_span)
      renderList();[span_788](start_span)[span_788](end_span)

      const summary =[span_789](start_span)[span_789](end_span)
        `Bewertungen importiert: ${ratingSavedCount} Titel bewertet, ` +[span_790](start_span)[span_790](end_span)
        `${addedToSeenCount} zu „Gesehen“ ergänzt (Gesamt Gesehen: ${seenEntries.length}), ` +[span_791](start_span)[span_791](end_span)
        `${watchlistUpdatedCount} Merklisten-Einträge aktualisiert.`;[span_792](start_span)[span_792](end_span)
      if (ratingsImportStatus) ratingsImportStatus.textContent = summary;[span_793](start_span)[span_793](end_span)
      debugLog(summary);[span_794](start_span)[span_794](end_span)
    } catch (err) {[span_795](start_span)[span_795](end_span)
      const msg = "Bewertungs-Import fehlgeschlagen: " + (err?.message || String(err));[span_796](start_span)[span_796](end_span)
      if (ratingsImportStatus) ratingsImportStatus.textContent = msg;[span_797](start_span)[span_797](end_span)
      debugLog(msg);[span_798](start_span)[span_798](end_span)
    }
  });[span_799](start_span)[span_799](end_span)
}

if (clearRatingsImportInputBtn) {[span_800](start_span)[span_800](end_span)
  clearRatingsImportInputBtn.addEventListener("click", () => {[span_801](start_span)[span_801](end_span)
    if (ratingsImportTextarea) ratingsImportTextarea.value = "";[span_802](start_span)[span_802](end_span)
    if (ratingsImportFileInput) ratingsImportFileInput.value = "";[span_803](start_span)[span_803](end_span)
    if (ratingsImportStatus) ratingsImportStatus.textContent = "Eingabe geleert.";[span_804](start_span)[span_804](end_span)
  });[span_805](start_span)[span_805](end_span)
}

addForm.addEventListener("submit", (e) => {[span_806](start_span)[span_806](end_span)
  e.preventDefault();[span_807](start_span)[span_807](end_span)
  const title = titleInput.value.trim();[span_808](start_span)[span_808](end_span)
  if (!title) return;[span_809](start_span)[span_809](end_span)
  const chosenType = typeInput ? normalizeMediaType(typeInput.value) : "Film";[span_810](start_span)[span_810](end_span)
  if (statusInput && statusInput.value === "Gesehen") {[span_811](start_span)[span_811](end_span)
    addSeenEntry(title, chosenType);[span_812](start_span)[span_812](end_span)
    renderSeenList();[span_813](start_span)[span_813](end_span)
    titleInput.value = "";[span_814](start_span)[span_814](end_span)
    titleInput.focus();[span_815](start_span)[span_815](end_span)
    return;[span_816](start_span)[span_816](end_span)
  }
  items.unshift({[span_817](start_span)[span_817](end_span)
    id: crypto.randomUUID(),[span_818](start_span)[span_818](end_span)
    title,[span_819](start_span)[span_819](end_span)
    type: chosenType,[span_820](start_span)[span_820](end_span)
    provider: providerInput.value,[span_821](start_span)[span_821](end_span)
    rating: null[span_822](start_span)[span_822](end_span)
  });[span_823](start_span)[span_823](end_span)
  saveItems();[span_824](start_span)[span_824](end_span)
  renderList();[span_825](start_span)[span_825](end_span)
  titleInput.value = "";[span_826](start_span)[span_826](end_span)
  titleInput.focus();[span_827](start_span)[span_827](end_span)
});[span_828](start_span)[span_828](end_span)

providerFilter.addEventListener("change", renderList);[span_829](start_span)[span_829](end_span)
ratingFilter.addEventListener("change", renderList);[span_830](start_span)[span_830](end_span)
if (seenRatingFilter) {[span_831](start_span)[span_831](end_span)
  seenRatingFilter.addEventListener("change", renderSeenList);[span_832](start_span)[span_832](end_span)
}
if (seenTypeFilter) {[span_833](start_span)[span_833](end_span)
  seenTypeFilter.addEventListener("change", renderSeenList);[span_834](start_span)[span_834](end_span)
}

saveKeyBtn.addEventListener("click", () => {[span_835](start_span)[span_835](end_span)
  const val = apiKeyInput.value.trim();[span_836](start_span)[span_836](end_span)
  if (!val) return;[span_837](start_span)[span_837](end_span)
  localStorage.setItem(API_KEY_STORAGE, val);[span_838](start_span)[span_838](end_span)
  apiKeyInput.value = "";[span_839](start_span)[span_839](end_span)
  updateApiBadge();[span_840](start_span)[span_840](end_span)
  aiStatus.textContent = "API-Key lokal gespeichert. Du kannst jetzt eine Empfehlung anfordern.";[span_841](start_span)[span_841](end_span)
  debugLog("API-Key gespeichert (Länge: " + val.length + " Zeichen).");[span_842](start_span)[span_842](end_span)
});[span_843](start_span)[span_843](end_span)

clearKeyBtn.addEventListener("click", () => {[span_844](start_span)[span_844](end_span)
  localStorage.removeItem(API_KEY_STORAGE);[span_845](start_span)[span_845](end_span)
  apiKeyInput.value = "";[span_846](start_span)[span_846](end_span)
  updateApiBadge();[span_847](start_span)[span_847](end_span)
  aiStatus.textContent = "Gespeicherter API-Key entfernt.";[span_848](start_span)[span_848](end_span)
  aiRecommendations.innerHTML = "";[span_849](start_span)[span_849](end_span)
  debugLog("API-Key entfernt.");[span_850](start_span)[span_850](end_span)
});[span_851](start_span)[span_851](end_span)

recommendBtn.addEventListener("click", async () => {[span_852](start_span)[span_852](end_span)
  const key = getApiKey();[span_853](start_span)[span_853](end_span)
  const mood = moodInput.value.trim() || "abwechslungsreich";[span_854](start_span)[span_854](end_span)
  const availMode = availabilityMode.value;[span_855](start_span)[span_855](end_span)
  const searchEnabled = Boolean(useSearchToggle.checked);[span_856](start_span)[span_856](end_span)

  const titles = items[span_857](start_span)[span_857](end_span)
    .map((i) => {[span_858](start_span)[span_858](end_span)
      const meta = [i.type, i.provider || "Sonstiges", i.rating ? "Bewertung: " + i.rating : null][span_859](start_span)[span_859](end_span)
        .filter(Boolean)[span_860](start_span)[span_860](end_span)
        .join(", ");[span_861](start_span)[span_861](end_span)
      return i.title + (meta ? " [" + meta + "]" : "");[span_862](start_span)[span_862](end_span)
    })[span_863](start_span)[span_863](end_span)
    .join(", ");[span_864](start_span)[span_864](end_span)

  const superLiked = [];[span_865](start_span)[span_865](end_span)
  const liked = [];[span_866](start_span)[span_866](end_span)
  const disliked = [];[span_867](start_span)[span_867](end_span)
  const allSeenTitles = [];[span_868](start_span)[span_868](end_span)

  seenEntries.forEach((e) => {[span_869](start_span)[span_869](end_span)
    const cleanTitle = stripMarkdown(e.title || "");[span_870](start_span)[span_870](end_span)
    if (!cleanTitle) return;[span_871](start_span)[span_871](end_span)
    allSeenTitles.push(cleanTitle);[span_872](start_span)[span_872](end_span)
    const r = getTitleRating(cleanTitle);[span_873](start_span)[span_873](end_span)
    const label = e.type ? cleanTitle + " (" + e.type + ")" : cleanTitle;[span_874](start_span)[span_874](end_span)
    if (r === "Finde ich super") superLiked.push(label);[span_875](start_span)[span_875](end_span)
    else if (r === "Gefällt mir") liked.push(label);[span_876](start_span)[span_876](end_span)
    else if (r === "Nicht gefällt mir") disliked.push(label);[span_877](start_span)[span_877](end_span)
  });[span_878](start_span)[span_878](end_span)

  const seenListText =[span_879](start_span)[span_879](end_span)
    "Finde ich super: " + (superLiked.length > 0 ? superLiked.join(", ") : "keine"),[span_880](start_span)[span_880](end_span)
    "Gefällt mir: " + (liked.length > 0 ? liked.join(", ") : "keine"),[span_881](start_span)[span_881](end_span)
    "Nicht gefällt mir: " + (disliked.length > 0 ? disliked.join(", ") : "keine"),[span_882](start_span)[span_882](end_span)
    "Alle gesehenen Titel (streng ausschließen): " + (allSeenTitles.length > 0 ? allSeenTitles.join(", ") : "keine")[span_883](start_span)[span_883](end_span)
  ].join(" | ");[span_884](start_span)[span_884](end_span)

  await fetchGeminiRecommendations({[span_885](start_span)[span_885](end_span)
    apiKey: key,[span_886](start_span)[span_886](end_span)
    mood,[span_887](start_span)[span_887](end_span)
    availMode,[span_888](start_span)[span_888](end_span)
    searchEnabled,[span_889](start_span)[span_889](end_span)
    enabledProviders,[span_890](start_span)[span_890](end_span)
    providers: PROVIDERS,[span_891](start_span)[span_891](end_span)
    titles,[span_892](start_span)[span_892](end_span)
    seenListText,[span_893](start_span)[span_893](end_span)
    onStatus: (text) => {[span_894](start_span)[span_894](end_span)
      aiStatus.textContent = text;[span_895](start_span)[span_895](end_span)
    },
    onRecommendations: (recs) => {[span_896](start_span)[span_896](end_span)
      renderRecommendations(aiRecommendations, recs);[span_897](start_span)[span_897](end_span)
    },
    onLog: debugLog[span_898](start_span)[span_898](end_span)
  });[span_899](start_span)[span_899](end_span)
});[span_900](start_span)[span_900](end_span)

let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");[span_901](start_span)[span_901](end_span)
if (!Array.isArray(items) || items.length === 0) {[span_902](start_span)[span_902](end_span)
  items = [[span_903](start_span)[span_903](end_span)
    { id: crypto.randomUUID(), title: "Dark", type: "Serie", provider: "Netflix", rating: "Finde ich super" },[span_904](start_span)[span_904](end_span)
    { id: crypto.randomUUID(), title: "Tatort", type: "Serie", provider: "ARD", rating: "Gefällt mir" }[span_905](start_span)[span_905](end_span)
  ];[span_906](start_span)[span_906](end_span)
  saveItems();[span_907](start_span)[span_907](end_span)
}

function loadSeenEntries() {[span_908](start_span)[span_908](end_span)
  const rawV2 = localStorage.getItem(SEEN_TITLES_STORAGE);[span_909](start_span)[span_909](end_span)
  if (rawV2) {[span_910](start_span)[span_910](end_span)
    try {[span_911](start_span)[span_911](end_span)
      const parsed = JSON.parse(rawV2);[span_912](start_span)[span_912](end_span)
      if (Array.isArray(parsed)) {[span_913](start_span)[span_913](end_span)
        return parsed[span_914](start_span)[span_914](end_span)
          .map((entry) => {[span_915](start_span)[span_915](end_span)
            if (typeof entry === "string") {[span_916](start_span)[span_916](end_span)
              const title = stripMarkdown(entry);[span_917](start_span)[span_917](end_span)
              return { title, type: autoInferMediaType(title) };[span_918](start_span)[span_918](end_span)
            }
            if (entry && typeof entry === "object" && entry.title) {[span_919](start_span)[span_919](end_span)
              const title = stripMarkdown(entry.title);[span_920](start_span)[span_920](end_span)
              return {[span_921](start_span)[span_921](end_span)
                title,[span_922](start_span)[span_922](end_span)
                type: entry.type ? normalizeMediaType(entry.type) : autoInferMediaType(title)[span_923](start_span)[span_923](end_span)
              };[span_924](start_span)[span_924](end_span)
            }
            return null;[span_925](start_span)[span_925](end_span)
          })[span_926](start_span)[span_926](end_span)
          .filter((e) => e && e.title);[span_927](start_span)[span_927](end_span)
      }
    } catch {[span_928](start_span)[span_928](end_span)
      // ignore[span_929](start_span)[span_929](end_span)
    }
  }
  const rawLegacy = localStorage.getItem(SEEN_TITLES_LEGACY_STORAGE);[span_930](start_span)[span_930](end_span)
  if (rawLegacy) {[span_931](start_span)[span_931](end_span)
    try {[span_932](start_span)[span_932](end_span)
      const parsedLegacy = JSON.parse(rawLegacy);[span_933](start_span)[span_933](end_span)
      if (Array.isArray(parsedLegacy)) {[span_934](start_span)[span_934](end_span)
        const migrated = parsedLegacy[span_935](start_span)[span_935](end_span)
          .filter((t) => typeof t === "string" && stripMarkdown(t))[span_936](start_span)[span_936](end_span)
          .map((t) => {[span_937](start_span)[span_937](end_span)
            const title = stripMarkdown(t);[span_938](start_span)[span_938](end_span)
            return { title, type: autoInferMediaType(title) };[span_939](start_span)[span_939](end_span)
          });[span_940](start_span)[span_940](end_span)
        localStorage.setItem(SEEN_TITLES_STORAGE, JSON.stringify(migrated));[span_941](start_span)[span_941](end_span)
        return migrated;[span_942](start_span)[span_942](end_span)
      }
    } catch {[span_943](start_span)[span_943](end_span)
      // ignore[span_944](start_span)[span_944](end_span)
    }
  }
  return [];[span_945](start_span)[span_945](end_span)
}

let seenEntries = loadSeenEntries();[span_946](start_span)[span_946](end_span)
const initialAutoFilledTypes = autoFillMissingSeenTypes(seenEntries);
if (initialAutoFilledTypes > 0) {
  saveSeenEntries();
}
let seenRatings = loadSeenRatings();[span_947](start_span)[span_947](end_span)

let enabledProviders = JSON.parse(localStorage.getItem(ACTIVE_PROVIDERS_STORAGE) || "null");[span_948](start_span)[span_948](end_span)
if (!Array.isArray(enabledProviders)) {[span_949](start_span)[span_949](end_span)
  enabledProviders = [...PROVIDERS];[span_950](start_span)[span_950](end_span)
  saveEnabledProviders();[span_951](start_span)[span_951](end_span)
} else {[span_952](start_span)[span_952](end_span)
  enabledProviders = enabledProviders.filter((p) => PROVIDERS.includes(p));[span_953](start_span)[span_953](end_span)
}

renderVersionInfo();[span_954](start_span)[span_954](end_span)
seenCountEl.textContent = String(seenEntries.length);[span_955](start_span)[span_955](end_span)
updateApiBadge();[span_956](start_span)[span_956](end_span)
syncProviderSelects();[span_957](start_span)[span_957](end_span)
renderProviderToggles();[span_958](start_span)[span_958](end_span)
renderList();[span_959](start_span)[span_959](end_span)
renderSeenList();[span_960](start_span)[span_960](end_span)
debugLog(
  "Watchlist-Kurator (" + APP_VERSION + ") initialisiert" +
  (initialAutoFilledTypes > 0 ? " | Typ automatisch ergänzt bei " + initialAutoFilledTypes + " Gesehen-Einträgen." : ".")
);[span_961](start_span)[span_961](end_span)
