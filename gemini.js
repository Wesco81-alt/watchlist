const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite"
];
const GEMINI_API_HOST = "generativelanguage.googleapis.com";
const GEMINI_REQUEST_TIMEOUT_MS = 45000;
const GEMINI_SEARCH_REQUEST_TIMEOUT_MS = 90000;
const GEMINI_RETRY_DELAY_MS = 2000;
const GEMINI_MAX_FALLBACKS = 2;
const GEMINI_PREFERRED_MODEL_STORAGE = "watchlist_kurator_gemini_preferred_model_v1";
const RECOMMENDATION_HISTORY_STORAGE = "watchlist_kurator_recommendation_history_v1";
const RECOMMENDATION_COUNT_STORAGE = "watchlist_kurator_recommendation_count_v1";
const DYNAMIC_PRESETS_STORAGE = "watchlist_kurator_dynamic_presets_v1";
const RECOMMENDATION_COOLDOWN_DAYS = 60;
const RECOMMENDATION_HISTORY_MAX = 500;
const DEFAULT_RECOMMENDATION_COUNT = 4;

function normalizeSuggestedTitle(title) {
  return stripMarkdown(title).replace(/\s+/g, " ").trim();
}

function titleKey(title) {
  return normalizeSuggestedTitle(title).toLocaleLowerCase("de-DE");
}

function normalizeRecommendationRatingLabel(val) {
  if (val === "Nicht gefällt mir") return "Gefällt mir nicht";
  if (["Gefällt mir nicht", "Gefällt mir", "Finde ich super"].includes(val)) return val;
  return null;
}

function getRecommendationCount() {
  const stored = Number(localStorage.getItem(RECOMMENDATION_COUNT_STORAGE));
  return Number.isInteger(stored) && stored >= 1 && stored <= 10
    ? stored
    : DEFAULT_RECOMMENDATION_COUNT;
}

function initializeRecommendationCountSetting() {
  const apiView = document.getElementById("apiView");
  if (!apiView || document.getElementById("recommendationCountInput")) return;

  const card = document.createElement("section");
  card.className = "card";
  card.style.marginTop = "16px";
  card.innerHTML =
    "<h2>KI-Empfehlungen</h2>" +
    '<div class="meta">Lege fest, wie viele Titel die KI pro Anfrage vorschlagen soll (1–10). Die Einstellung wird lokal gespeichert.</div>' +
    '<div class="row" style="margin-top:10px;">' +
      '<label class="meta" for="recommendationCountInput">Anzahl der Vorschläge:</label>' +
      '<input id="recommendationCountInput" type="number" min="1" max="10" step="1" value="" style="width:100px;" aria-label="Anzahl der KI-Empfehlungen" />' +
    '</div>' +
    '<div id="recommendationCountStatus" class="status-msg"></div>';

  const debugSection = Array.from(apiView.querySelectorAll("section.card"))
    .find((section) => section.querySelector("#debugOutput"));
  if (debugSection) apiView.insertBefore(card, debugSection);
  else apiView.append(card);

  const input = document.getElementById("recommendationCountInput");
  const status = document.getElementById("recommendationCountStatus");
  input.value = String(getRecommendationCount());
  status.textContent = "Aktuell eingestellt: " + input.value;

  const saveCount = () => {
    const parsed = Number(input.value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      status.textContent = "Bitte eine ganze Zahl zwischen 1 und 10 eingeben.";
      return;
    }
    localStorage.setItem(RECOMMENDATION_COUNT_STORAGE, String(parsed));
    status.textContent = "Gespeichert: " + parsed + (parsed === 1 ? " Vorschlag pro Anfrage." : " Vorschläge pro Anfrage.");
  };
  input.addEventListener("change", saveCount);
  input.addEventListener("blur", saveCount);
}

function loadRecommendationHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECOMMENDATION_HISTORY_STORAGE) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && entry.title && entry.suggestedAt)
      .map((entry) => ({
        title: normalizeSuggestedTitle(entry.title),
        suggestedAt: entry.suggestedAt,
        type: entry.type ? normalizeMediaType(entry.type, entry) : null,
        year: entry.year ? stripMarkdown(entry.year) : "",
        provider: entry.provider ? normalizeProvider(entry.provider) : "",
        cluster: entry.cluster ? stripMarkdown(entry.cluster) : "",
        feedback: normalizeRecommendationRatingLabel(entry.feedback) ?? null
      }));
  } catch {
    return [];
  }
}

function saveRecommendationHistory(history) {
  const deduped = new Map();
  [...history].reverse().forEach((entry) => {
    const key = titleKey(entry.title);
    if (key && !deduped.has(key)) deduped.set(key, entry);
  });
  const trimmed = Array.from(deduped.values())
    .sort((a, b) => String(b.suggestedAt).localeCompare(String(a.suggestedAt)))
    .slice(0, RECOMMENDATION_HISTORY_MAX);
  localStorage.setItem(RECOMMENDATION_HISTORY_STORAGE, JSON.stringify(trimmed));
}

function updateHistoryBadgeCount(count) {
  const total = typeof count === "number" ? count : loadRecommendationHistory().length;
  const badge = document.getElementById("historyCount") || document.getElementById("historyCountBadge");
  if (badge) badge.textContent = String(total);
}

function getRecentRecommendationTitles() {
  const cutoff = Date.now() - RECOMMENDATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return loadRecommendationHistory()
    .filter((entry) => new Date(entry.suggestedAt).getTime() >= cutoff)
    .map((entry) => normalizeSuggestedTitle(entry.title));
}

function syncRecommendationHistoryFeedback(title, rating) {
  const targetKey = titleKey(title);
  if (!targetKey) return;
  const normalized = normalizeRecommendationRatingLabel(rating);
  const history = loadRecommendationHistory();
  let changed = false;
  history.forEach((entry) => {
    if (titleKey(entry.title) === targetKey && entry.feedback !== normalized) {
      entry.feedback = normalized;
      changed = true;
    }
  });
  if (changed) {
    saveRecommendationHistory(history);
    renderRecommendationHistoryView();
  }
}

function recordRecommendations(recs) {
  if (!Array.isArray(recs)) return 0;
  const history = loadRecommendationHistory();
  const now = new Date().toISOString();
  let added = 0;
  recs.forEach((rec) => {
    const title = normalizeSuggestedTitle(rec?.title || "");
    const key = titleKey(title);
    if (!key) return;
    const mediaType = rec?.type ? normalizeMediaType(rec.type, rec) : null;
    const year = rec?.year ? stripMarkdown(rec.year) : "";
    const provider = rec?.provider ? normalizeProvider(rec.provider) : "";
    const cluster = rec?.cluster ? stripMarkdown(rec.cluster) : "";
    const existingRating = typeof getTitleRating === "function"
      ? normalizeRecommendationRatingLabel(getTitleRating(title))
      : null;

    const existingIndex = history.findIndex((entry) => titleKey(entry.title) === key);
    if (existingIndex >= 0) {
      history[existingIndex] = {
        ...history[existingIndex],
        title,
        suggestedAt: now,
        type: mediaType || history[existingIndex].type || null,
        year: year || history[existingIndex].year || "",
        provider: provider || history[existingIndex].provider || "",
        cluster: cluster || history[existingIndex].cluster || "",
        feedback: existingRating ?? history[existingIndex].feedback ?? null
      };
    } else {
      history.unshift({
        title,
        suggestedAt: now,
        type: mediaType,
        year,
        provider,
        cluster,
        feedback: existingRating
      });
      added += 1;
    }
  });
  saveRecommendationHistory(history);
  renderRecommendationHistoryView();
  return added || (recs.length > 0 ? recs.length : 0);
}

function removeRecommendationHistoryEntry(title) {
  const targetKey = titleKey(title);
  if (!targetKey) return;
  const next = loadRecommendationHistory().filter((entry) => titleKey(entry.title) !== targetKey);
  saveRecommendationHistory(next);
  renderRecommendationHistoryView();
}

function clearRecommendationHistory() {
  localStorage.removeItem(RECOMMENDATION_HISTORY_STORAGE);
  renderRecommendationHistoryView();
}

function formatHistoryDate(isoStr) {
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return String(isoStr || "");
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isWithinCooldown(isoStr) {
  const ts = new Date(isoStr).getTime();
  if (!Number.isFinite(ts)) return false;
  return ts >= Date.now() - RECOMMENDATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

function renderRecommendationHistoryView() {
  const container = document.getElementById("recommendationHistoryContainer");
  const filterInput = document.getElementById("historyFilterInput");
  const history = loadRecommendationHistory();
  updateHistoryBadgeCount(history.length);
  if (!container) return;

  const query = String(filterInput?.value || "").trim().toLocaleLowerCase("de-DE");
  const filtered = query
    ? history.filter((entry) => {
        const haystack = [
          entry.title,
          entry.type,
          entry.year,
          entry.provider,
          entry.cluster,
          entry.feedback
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("de-DE");
        return haystack.includes(query);
      })
    : history;

  container.innerHTML = "";
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="meta">' +
      (history.length === 0
        ? "Noch keine KI-Empfehlungen in der Historie gespeichert."
        : "Keine Historien-Einträge passend zum Suchfilter gefunden.") +
      "</div>";
    return;
  }

  filtered.forEach((entry) => {
    const activeCooldown = isWithinCooldown(entry.suggestedAt);
    const row = document.createElement("div");
    row.className = "item";

    const info = document.createElement("div");
    const ratingIcon = typeof getRatingIcon === "function" && entry.feedback
      ? getRatingIcon(entry.feedback) + " "
      : "";
    const badges = [
      entry.type ? '<span class="type-pill">' + escapeHtml(entry.type) + "</span>" : "",
      entry.provider ? '<span class="provider-pill">' + escapeHtml(entry.provider) + "</span>" : "",
      entry.cluster ? '<span class="avail-pill">' + escapeHtml(entry.cluster) + "</span>" : "",
      entry.feedback ? '<span class="rating-pill">' + escapeHtml(ratingIcon + entry.feedback) + "</span>" : "",
      activeCooldown
        ? '<span class="avail-pill">Sperre aktiv (' + RECOMMENDATION_COOLDOWN_DAYS + "d)</span>"
        : '<span class="meta">Sperre abgelaufen</span>'
    ]
      .filter(Boolean)
      .join(" ");

    info.innerHTML =
      "<div>" +
        "<strong>" + escapeHtml(entry.title) + "</strong>" +
        (entry.year ? " (" + escapeHtml(entry.year) + ")" : "") +
        " " + badges +
      "</div>" +
      '<div class="meta">Vorgeschlagen am ' + escapeHtml(formatHistoryDate(entry.suggestedAt)) + "</div>";

    const actions = document.createElement("div");
    actions.className = "actions";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "unseen-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Titel aus der Historie entfernen";
    removeBtn.setAttribute("aria-label", "Titel aus der Historie entfernen: " + entry.title);
    removeBtn.addEventListener("click", () => {
      removeRecommendationHistoryEntry(entry.title);
    });

    actions.append(removeBtn);
    row.append(info, actions);
    container.append(row);
  });
}

function initializeHistoryView() {
  const nav = document.querySelector("nav.menu-bar") || document.querySelector("nav");
  let historyBtn = document.querySelector('.nav-btn[data-view="historyView"]');
  if (!historyBtn && nav) {
    historyBtn = document.createElement("button");
    historyBtn.type = "button";
    historyBtn.className = "nav-btn";
    historyBtn.dataset.view = "historyView";
    historyBtn.innerHTML = 'Historie (<span id="historyCount">0</span>)';
    const apiBtn = nav.querySelector('.nav-btn[data-view="apiView"]');
    if (apiBtn) nav.insertBefore(historyBtn, apiBtn);
    else nav.append(historyBtn);
  }

  let historyView = document.getElementById("historyView");
  if (!historyView) {
    const mainEl = document.querySelector("main") || document.body;
    historyView = document.createElement("div");
    historyView.id = "historyView";
    historyView.className = "view";
    historyView.innerHTML =
      '<section class="card">' +
        '<div class="rec-head">' +
          "<div>" +
            '<h2 style="margin-bottom:4px;">Empfehlungs-Historie</h2>' +
            '<div class="meta">Kürzlich vorgeschlagene Titel (Wiederholungsschutz: ' +
              RECOMMENDATION_COOLDOWN_DAYS +
              " Tage, max. " +
              RECOMMENDATION_HISTORY_MAX +
              " Einträge).</div>" +
          "</div>" +
          '<button id="clearHistoryBtn" type="button" class="secondary">Historie leeren</button>' +
        "</div>" +
        '<div class="row" style="margin-top:12px;">' +
          '<input id="historyFilterInput" type="search" placeholder="Historie nach Titel, Typ, Anbieter oder Cluster filtern..." aria-label="Historie filtern" />' +
        "</div>" +
        '<div class="list" id="recommendationHistoryContainer"></div>' +
      "</section>";
    mainEl.append(historyView);
  }

  if (historyBtn && !historyBtn.dataset.historyBound) {
    historyBtn.dataset.historyBound = "true";
    historyBtn.addEventListener("click", () => {
      if (typeof switchView === "function") {
        switchView("historyView");
      } else {
        const allViews = Array.from(document.querySelectorAll(".view"));
        const allNavButtons = Array.from(document.querySelectorAll(".nav-btn"));
        allViews.forEach((v) => v.classList.toggle("active", v.id === "historyView"));
        allNavButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === "historyView"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      renderRecommendationHistoryView();
    });
  }

  const filterInput = document.getElementById("historyFilterInput");
  if (filterInput && !filterInput.dataset.historyBound) {
    filterInput.dataset.historyBound = "true";
    filterInput.addEventListener("input", renderRecommendationHistoryView);
  }

  const clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn && !clearBtn.dataset.historyBound) {
    clearBtn.dataset.historyBound = "true";
    clearBtn.addEventListener("click", () => {
      if (loadRecommendationHistory().length === 0) return;
      clearRecommendationHistory();
    });
  }

  renderRecommendationHistoryView();
}

function buildAvailabilityCheckUrl(title, provider) {
  const queryParts = [stripMarkdown(title)];
  if (provider && provider !== "Sonstiges") {
    if (provider === "Tresat") queryParts.push("3sat Mediathek");
    else if (["ARD", "ZDF", "Joyn", "Netzkino"].includes(provider)) queryParts.push(provider + " Mediathek");
    else queryParts.push(provider);
  }
  return "https://www.google.com/search?q=" + encodeURIComponent(queryParts.join(" "));
}

function buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled, recentRecommendationTitles, recommendationCount }) {
  const count = recommendationCount || getRecommendationCount();
  const providerHint = enabledProviders.length > 0
    ? "Bevorzuge beim Feld 'provider' nach Möglichkeit einen dieser aktiven Anbieter: " + enabledProviders.join(", ") + "."
    : "Nutze als 'provider' einen passenden Eintrag aus: " + providers.join(", ") + ".";
  const repeatInstruction = recentRecommendationTitles?.length
    ? "Vermeide diese Titel, die kürzlich bereits vorgeschlagen wurden: " + recentRecommendationTitles.join(", ") + "."
    : "Es gibt keine kürzlich vorgeschlagenen Titel, die vermieden werden müssten.";
  const focusHint = availMode
    ? "Kontext-Hinweis (nur als grobe Richtung, keine Verfügbarkeits-Vorhersage): " + availMode + "."
    : "";
  const searchInstruction = searchEnabled
    ? "Nutze die Google-Suche nur zur Faktenprüfung von Titel, Erscheinungsjahr, Laufzeit, Inhalt und Hauptdarstellern – nicht, um eine garantierte aktuelle Streaming-Verfügbarkeit zu behaupten."
    : "Verzichte auf Spekulationen über aktuelle Streaming-Rechte oder Katalog-Verfügbarkeiten; setze bei 'availability' ehrlich 'Anbieter prüfen', wenn kein fester Sender/Katalog sicher ist.";

  return [
    "Du bist ein feinsinniger Film- und Serien-Kurator für Deutschland.",
    "Dein Hauptauftrag ist NICHT die Vorhersage von Streaming-Verfügbarkeiten, sondern treffsichere Empfehlungen auf Basis des Sehverlaufs, der Bewertungen und einer sinnvollen thematischen, atmosphärischen oder dramaturgischen Clusterbildung.",
    "Aktuelle Merkliste (inkl. Bewertungen): " + (titles || "keine Einträge") + ".",
    "Gesehene Titel & Bewertungen (" + seenListText + ").",
    "Geschmacksprofil & Gewichtung: Nutze vor allem 'Finde ich super' als wichtigsten Kompass für Stil, Stimmung, Dramaturgie, Spannungskurve und Themen. Beziehe 'Gefällt mir' positiv ein und vermeide 'Gefällt mir nicht' sowie direkte inhaltliche oder stilistische Kopien davon.",
    repeatInstruction,
    "Schlage keine Titel aus der Merkliste oder der gesehenen Liste vor (auch nicht in leicht abweichender Schreibweise oder als bereits gesehene Staffel/Reihe).",
    "Wunsch/Stimmung: " + mood + ".",
    focusHint,
    providerHint,
    searchInstruction,
    "Wichtig für 'cluster' und 'clusterDesc': Gruppiere die Empfehlungen in sinnvolle inhaltliche, atmosphärische oder dramaturgische Cluster. Formuliere 'cluster' als pointierte Überschrift mit maximal 3 bis 5 Wörtern (z. B. 'Kalte Rätsel im Nebel' oder 'Gnadenlose Doppelböden') – niemals bloß Anbieternamen, Mediatheken oder Verfügbarkeits-Begriffe. Formuliere 'clusterDesc' als knappe, prägnante Clusterbeschreibung in 1 bis 2 kurzen Sätzen zum gemeinsamen Kern der Titel.",
    "Wichtig für 'reason': Schreibe in 'reason' eine klare, gut lesbare Begründung in 3 bis 5 Sätzen. Verzichte komplett auf technische Ausführungen zu Bildsprache, Kameraführung, Schnitt oder Sounddesign. Gehe stattdessen direkt im fließenden Text auf drei Dinge ein: (1) eine kurze Beschreibung des Inhalts (ohne Spoiler), (2) die wichtigsten beteiligten Hauptdarsteller und (3) an welchen konkreten anderen Filmen oder Serien – insbesondere aus den positiv bewerteten Favoriten – sich die Empfehlung thematisch, tonal oder erzählerisch orientiert.",
    "Antworte auf Deutsch mit genau " + count + " konkreten Empfehlungen als reines JSON-Array ohne einleitenden oder abschließenden Text:",
    '[{"cluster":"Pointierte Überschrift (3-5 Wörter)","clusterDesc":"Knappe Clusterbeschreibung in 1 bis 2 kurzen Sätzen.","title":"Titel","type":"Film oder Serie","year":"Jahr","runtime":"Laufzeit oder Staffeln","provider":"Anbieter","availability":"z.B. Geschmacks-Match oder Anbieter prüfen","reason":"Kurze Inhaltsbeschreibung (spoilerfrei), Nennung der Hauptdarsteller sowie Einordnung, an welchen anderen Filmen oder Serien sich die Empfehlung orientiert (insgesamt 3 bis 5 Sätze)."}]'
  ].join(" ");
}

function extractJsonArrayText(rawText) {
  let cleaned = String(rawText).replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  return cleaned;
}

function parseRecommendationsJson(rawText) {
  const parsed = JSON.parse(extractJsonArrayText(rawText));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.recommendations)) return parsed.recommendations;
  return null;
}

function parseApiResponseText(rawBody, httpStatus) {
  const trimmed = String(rawBody || "").trim();
  if (!trimmed) throw new Error("Leere Antwort (HTTP " + httpStatus + ")");
  if (trimmed.startsWith("<")) throw new Error("Server lieferte HTML statt JSON (HTTP " + httpStatus + ")");
  try { return JSON.parse(trimmed); }
  catch { throw new Error("Ungültiges JSON (HTTP " + httpStatus + ")"); }
}

function getOrderedGeminiModels() {
  const preferred = localStorage.getItem(GEMINI_PREFERRED_MODEL_STORAGE);
  if (!GEMINI_MODELS.includes(preferred)) return [...GEMINI_MODELS];
  return [preferred, ...GEMINI_MODELS.filter((model) => model !== preferred)];
}

function getHttpStatus(errorMessage) {
  const match = String(errorMessage || "").match(/Status\s+(\d{3})|HTTP\s+(\d{3})/i);
  return match ? Number(match[1] || match[2]) : null;
}

function isFallbackWorthwhile(error) {
  if (error?.name === "AbortError") return true;
  const message = String(error?.message || "");
  const status = getHttpStatus(message);
  if ([401, 403, 404].includes(status)) return false;
  return /invalid argument|400|high demand|overloaded|503|500|429|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|exceeded|rate|limit/i.test(message);
}

function buildRecommendationRatingGroup(title, onSelect) {
  const group = document.createElement("div");
  group.className = "rating-group";
  const currentRating = typeof getTitleRating === "function"
    ? normalizeRecommendationRatingLabel(getTitleRating(title))
    : null;

  const configs = [
    { value: "Gefällt mir nicht", icon: "👎", label: "Gefällt mir nicht", activeClass: "selected-dislike" },
    { value: "Gefällt mir", icon: "👍", label: "Gefällt mir", activeClass: "selected-like" },
    { value: "Finde ich super", icon: "👍👍", label: "Finde ich super", activeClass: "selected-super" }
  ];

  configs.forEach((cfg) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rate-btn";
    if (currentRating === cfg.value) btn.classList.add(cfg.activeClass);
    btn.textContent = cfg.icon;
    btn.title = cfg.label;
    btn.setAttribute("aria-label", cfg.label + " für " + title);
    btn.addEventListener("click", () => onSelect(cfg.value));
    group.append(btn);
  });

  return group;
}

function renderRecommendations(container, recs) {
  container.innerHTML = "";
  if (!Array.isArray(recs) || recs.length === 0) return;

  const grouped = new Map();
  for (const rec of recs) {
    const clusterName = stripMarkdown(rec.cluster || "Neue Empfehlungen");
    const clusterDesc = stripMarkdown(rec.clusterDesc || rec.clusterDescription || "");
    if (!grouped.has(clusterName)) grouped.set(clusterName, { desc: clusterDesc, items: [] });
    else if (!grouped.get(clusterName).desc && clusterDesc) grouped.get(clusterName).desc = clusterDesc;
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
      const provider = normalizeProvider(rec.provider);
      const availability = stripMarkdown(rec.availability || "Anbieter prüfen");
      const runtime = stripMarkdown(rec.runtime || "");
      const reason = stripMarkdown(rec.reason || "");

      const card = document.createElement("div");
      card.className = "rec-card";
      const head = document.createElement("div");
      head.className = "rec-head";
      const titleWrap = document.createElement("div");
      titleWrap.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" +
        (rec.year ? " (" + escapeHtml(rec.year) + ")" : "") +
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
        addToWatchlist(title, provider, null, mediaType);
        addBtn.textContent = "Gespeichert";
        addBtn.className = "success";
        addBtn.disabled = true;
      });
      rightActions.append(checkLink, addBtn);
      head.append(titleWrap, rightActions);
      card.append(head);

      if (runtime) {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = "Laufzeit: " + runtime;
        card.append(meta);
      }
      if (reason) {
        const body = document.createElement("div");
        body.textContent = reason;
        card.append(body);
      }

      const feedbackRow = document.createElement("div");
      feedbackRow.className = "rec-feedback-row";

      const handleSelectRating = (selectedRating) => {
        const current = typeof getTitleRating === "function"
          ? normalizeRecommendationRatingLabel(getTitleRating(title))
          : null;
        const nextRating = current === selectedRating ? null : selectedRating;
        if (typeof setTitleRating === "function") setTitleRating(title, nextRating);
        if (nextRating && typeof addSeenEntry === "function") addSeenEntry(title, mediaType);
        syncRecommendationHistoryFeedback(title, nextRating);
        if (typeof renderSeenList === "function") renderSeenList();
        if (typeof renderList === "function") renderList();
        if (typeof debugLog === "function") {
          debugLog("KI-Empfehlung bewertet: " + title + " -> " + (nextRating || "Bewertung entfernt"));
        }
        renderRecommendations(container, recs);
      };

      const ratingGroup = buildRecommendationRatingGroup(title, handleSelectRating);
      feedbackRow.append(ratingGroup, createSeenButton(title, mediaType));
      card.append(feedbackRow);
      clusterBlock.append(card);
    }
    container.append(clusterBlock);
  }
}

async function fetchGeminiRecommendations({ apiKey, mood, availMode, searchEnabled, enabledProviders, providers, titles, seenListText, recommendationCount, onStatus, onRecommendations, onLog }) {
  const providerPool = enabledProviders.length > 0 ? enabledProviders : providers;
  const count = Number.isInteger(recommendationCount)
    ? Math.min(10, Math.max(1, recommendationCount))
    : getRecommendationCount();

  onLog('Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") + ' | Anzahl: ' + count + ' | Modus: "' + availMode + '" | Aktive Anbieter: [' + providerPool.join(", ") + '] | Stimmung: "' + mood + '"');

  if (!apiKey) {
    onStatus("Demo-Hinweis: Für die Merkliste (" + (titles || "leer") + ") wäre ein passender nächster Titel im Bereich „" + mood + "“. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern.");
    onLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  const recentRecommendationTitles = getRecentRecommendationTitles();
  const timeoutMs = searchEnabled ? GEMINI_SEARCH_REQUEST_TIMEOUT_MS : GEMINI_REQUEST_TIMEOUT_MS;
  onLog("Wiederholungsschutz: " + recentRecommendationTitles.length + " Titel für " + RECOMMENDATION_COOLDOWN_DAYS + " Tage ausgeblendet.");
  onLog("Anfrage-Timeout: " + (timeoutMs / 1000) + "s | Gewünschte Vorschläge: " + count);
  onStatus(searchEnabled ? "Prüfe Titeldaten & kuratiere " + count + " Vorschläge in Clustern..." : "Kuratiere " + count + " Vorschläge in Clustern mit Gemini...");
  onRecommendations([]);

  const promptText = buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled, recentRecommendationTitles, recommendationCount: count });
  const orderedModels = getOrderedGeminiModels();
  const maxAttempts = Math.min(1 + GEMINI_MAX_FALLBACKS, orderedModels.length);
  const attemptedModels = [];
  let lastError = null;

  for (let idx = 0; idx < maxAttempts; idx++) {
    const model = orderedModels[idx];
    attemptedModels.push(model);
    const endpoint = "https://" + GEMINI_API_HOST + "/v1beta/models/" + model + ":generateContent";
    const requestUrl = endpoint + "?key=" + encodeURIComponent(apiKey);
    const controller = new AbortController();
    const startedAt = performance.now();
    let phase = "Warten auf HTTP-Header";
    let bytes = 0;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { maxOutputTokens: 3072 }
    };
    if (searchEnabled) requestBody.tools = [{ google_search: {} }];
    else requestBody.generationConfig.thinkingConfig = { thinkingBudget: 0 };

    onStatus("Prüfe Modell " + (idx + 1) + "/" + maxAttempts + ": " + model);
    onLog("Versuch " + (idx + 1) + "/" + maxAttempts + ": POST " + endpoint + " | Timeout: " + (timeoutMs / 1000) + "s");

    try {
      const res = await fetch(requestUrl, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(requestBody) });
      phase = "Lesen des Antwortkörpers";
      const rawBody = await res.text();
      bytes = new TextEncoder().encode(rawBody).length;
      onLog("Antwort von " + model + ": HTTP " + res.status + ", " + bytes + " Bytes, Gesamtdauer " + ((performance.now() - startedAt) / 1000).toFixed(2) + "s");

      const data = parseApiResponseText(rawBody, res.status);
      if (!res.ok) throw new Error((data?.error?.message || ("HTTP " + res.status)) + " [Status " + res.status + "]");

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.map((part) => part.text || "").join("\n").trim();
      onLog("Kandidatentext erhalten (" + rawText.length + " Zeichen).");

      try {
        const parsedRecs = parseRecommendationsJson(rawText);
        if (parsedRecs) {
          const limitedRecs = parsedRecs.slice(0, count);
          localStorage.setItem(GEMINI_PREFERRED_MODEL_STORAGE, model);
          recordRecommendations(limitedRecs);
          onStatus("Vorschläge erstellt (Modell: " + model + (searchEnabled ? ", mit Web-Suche" : "") + "): " + limitedRecs.length + " Vorschläge");
          onRecommendations(limitedRecs);
          onLog("JSON erfolgreich geparst (" + limitedRecs.length + " Einträge). Vorschlagsverlauf aktualisiert.");
        } else {
          onStatus(stripMarkdown(rawText) || "Keine Antwort erhalten.");
          onLog("Kein Array in JSON gefunden -> Textausgabe.");
        }
      } catch {
        onStatus(stripMarkdown(rawText) || "Keine Antwort erhalten.");
        onLog("Antwort war kein JSON -> Textausgabe.");
      }
      clearTimeout(timeoutId);
      return;
    } catch (err) {
      lastError = err;
      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
      if (err?.name === "AbortError") onLog("Timeout bei " + model + " nach " + elapsed + "s; Phase: " + phase + "; empfangene Bytes: " + bytes + ".");
      onLog("Fehler bei " + model + ": " + err.name + ": " + err.message);

      if (!isFallbackWorthwhile(err)) {
        onStatus("Fehler bei der Gemini-Anfrage (" + model + "): " + err.message);
        return;
      }

      if (idx < maxAttempts - 1) {
        const nextModel = orderedModels[idx + 1];
        const status = getHttpStatus(err.message);
        if (status === 400) onStatus("Modell " + model + " wurde mit HTTP 400 abgelehnt – wechsle direkt zu " + nextModel);
        else onStatus("Modell " + model + " nicht verfügbar – warte " + (GEMINI_RETRY_DELAY_MS / 1000) + "s, dann " + nextModel);
        onLog("Fallback aktiv -> und wechsle von " + model + " auf " + nextModel);
        if (status !== 400) await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") onStatus("Zeitüberschreitung nach " + (timeoutMs / 1000) + " Sekunden je Modell (getestet: " + attemptedModels.join(" -> ") + "). Details stehen im Debug-Log.");
  else onStatus("Fehler bei allen getesteten Modellen (" + attemptedModels.join(" -> ") + "): " + (lastError?.message || "Kontingent erschöpft oder aktuell ausgelastet."));
}

initializeRecommendationCountSetting();
initializeHistoryView();

(function () {
  const QUICK_PRESETS = [
    {
      id: "movie_evening",
      label: "Abendfüllender Film",
      moodText: "Abendfüllender Spielfilm mit rundem Spannungsbogen",
      promptHint: "Bevorzuge ausdrücklich Spielfilme (type: 'Film') mit stimmiger Dramaturgie für einen kompletten Filmabend."
    },
    {
      id: "miniseries",
      label: "Miniserie zum Wegschauen",
      moodText: "Kompakte Serie oder Miniserie mit Sogwirkung",
      promptHint: "Bevorzuge ausdrücklich Serien (type: 'Serie'), idealerweise kompakte Staffeln oder Miniserien mit hohem Sog."
    },
    {
      id: "last_super",
      label: "Wie letztes ‚Finde ich super‘",
      moodText: "",
      promptHint: "",
      resolveDynamic: () => {
        const ratingMap = typeof seenRatings === "object" && seenRatings ? seenRatings : {};
        const entries = Array.isArray(typeof seenEntries !== "undefined" ? seenEntries : null) ? seenEntries : [];

        const matchedFromEntries = [...entries]
          .reverse()
          .find((entry) => {
            const title = String(entry?.title || "").trim();
            if (!title) return false;
            const rating = typeof getTitleRating === "function"
              ? getTitleRating(title)
              : ratingMap[title.toLocaleLowerCase("de-DE")];
            return rating === "Finde ich super";
          });

        let anchorTitle = matchedFromEntries?.title ? String(matchedFromEntries.title).trim() : "";

        if (!anchorTitle) {
          const superKeys = Object.keys(ratingMap).filter((k) => ratingMap[k] === "Finde ich super");
          const lastKey = superKeys[superKeys.length - 1] || "";
          const fromEntriesByKey = entries.find(
            (entry) => String(entry?.title || "").trim().toLocaleLowerCase("de-DE") === lastKey
          );
          anchorTitle = fromEntriesByKey?.title ? String(fromEntriesByKey.title).trim() : lastKey;
        }

        if (!anchorTitle) {
          return {
            moodText: "Starke Favoriten-Richtung",
            promptHint: "Orientier dich besonders eng an den bestbewerteten Titeln ('Finde ich super')."
          };
        }

        return {
          moodText: "Nahe an „" + anchorTitle + "“",
          promptHint:
            "Orientier dich ganz besonders an der Stimmung, Dramaturgie, Tonalität und den thematischen Referenzen von „" +
            anchorTitle +
            "“ (bewertet mit 'Finde ich super'), ohne diesen Titel selbst vorzuschlagen."
        };
      }
    },
    {
      id: "fresh_angle",
      label: "Etwas Neues wagen",
      moodText: "Frischer Blickwinkel, überraschend aber passend",
      promptHint: "Bringe bewusst eine frische thematische oder erzählerische Note ein, die zum Geschmack passt, aber nicht wie eine bloße Wiederholung wirkt."
    },
    {
      id: "under_two_hours",
      label: "Unter 2 Stunden",
      moodText: "Kompakter Film unter 2 Stunden ohne Überlänge",
      promptHint: "Bevorzuge nach Möglichkeit Filme mit einer Laufzeit unter 120 Minuten (unter 2 Stunden), straff erzählt und ohne unnötige Längen."
    },
    {
      id: "doc_true_crime",
      label: "Doku oder True Crime",
      moodText: "Dokumentation oder True Crime mit echtem Hintergrund",
      promptHint: "Bevorzuge Dokumentationen, Reportagen oder True-Crime-Formate mit substanzieller Recherche oder realem Fallbezug statt rein fiktionaler Stoffe."
    },
    {
      id: "psychological_dense",
      label: "Psychologisch & dicht",
      moodText: "Psychologisch dicht, figurengetrieben und spannungsvoll",
      promptHint: "Setze auf psychologische Tiefe, Figurenkonflikte, innere Spannung und vielschichtige zwischenmenschliche Dynamiken statt reiner Action."
    },
    {
      id: "travel_nature_wide",
      label: "Reise, Natur & Weite",
      moodText: "Reise-, Natur- oder Landschaftsmotive mit Weite",
      promptHint: "Greife Reise-, Natur-, Landschafts- oder Unterwegs-Motive und prägnante Schauplätze auf, ohne in Kitsch, bloße Postkartenbilder oder Übernatürliches abzudriften."
    },
    {
      id: "watchlist_gems",
      label: "Versteckte Perlen aus der Merkliste",
      moodText: "Passende Auswahl aus der bestehenden Merkliste",
      promptHint: "Wähle vorrangig passende Titel aus der bereits vorhandenen 'Aktuellen Merkliste' aus (sofern Einträge vorhanden sind) und begründe, warum gerade sie zum Wunsch und Geschmacksprofil passen."
    }
  ];

  const RANDOM_SEEDS = [
    "unerwartete Figurenkonstellation mit ruhigem Aufbau",
    "dichte Atmosphäre und psychologische Spannung",
    "ungewöhnliche Schauplätze und starke Ortsbindung",
    "kompakte Erzählweise ohne Längen",
    "überraschende Wendungen ohne billige Effekte",
    "persönliche Konflikte und moralische Grauzonen",
    "prägnante Gegenwartsthemen oder realistische Lebenswelten"
  ];

  const FALLBACK_RANDOM_PRESETS = [
    {
      label: "Dichte Figurenspannung",
      moodText: "Psychologisch dichte Geschichte mit starken Figuren",
      promptHint: "Fokus auf Figurenkonflikte, innere Spannung und glaubwürdige Dialoge ohne unnötige Action."
    },
    {
      label: "Abgelegener Schauplatz",
      moodText: "Geschichte an einem markanten, abgelegenen Ort",
      promptHint: "Stelle den Ort und seine Wirkung auf die Figuren in den Mittelpunkt, ohne Kitsch oder Übernatürliches."
    },
    {
      label: "Straffer Abend-Film",
      moodText: "Kompakter Spielfilm mit klarem Spannungsbogen",
      promptHint: "Bevorzuge Spielfilme (type: 'Film') mit zügiger Dramaturgie und sauberem Abschluss."
    },
    {
      label: "Kleine Dosis Neues",
      moodText: "Etwas Ungewohntes, das trotzdem zum Geschmack passt",
      promptHint: "Bringe eine frische erzählerische oder thematische Richtung ein, die nicht nach bloßer Routine klingt."
    }
  ];

  let activeExtraPromptHint = "";
  let resetTimerId = null;

  function scheduleHintReset() {
    if (resetTimerId) {
      clearTimeout(resetTimerId);
    }
    resetTimerId = setTimeout(() => {
      activeExtraPromptHint = "";
      window.__activeDynamicPresetHint = "";
      resetTimerId = null;
    }, 1500);
  }

  const baseBuildPrompt = typeof window.buildGeminiPrompt === "function" ? window.buildGeminiPrompt : null;
  if (baseBuildPrompt && !baseBuildPrompt.__modesWrapped) {
    const wrappedBuildPrompt = function (params) {
      const combinedHint = [activeExtraPromptHint, window.__activeDynamicPresetHint]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" ");
      const isWatchlistGems = combinedHint.includes("Aktuellen Merkliste");
      const effectiveParams = isWatchlistGems
        ? { ...params, recentRecommendationTitles: [] }
        : params;
      const prompt = baseBuildPrompt.call(this, effectiveParams);
      if (!combinedHint) return prompt;
      return prompt + " Zusätzlicher Empfehlungs-Fokus: " + combinedHint;
    };
    wrappedBuildPrompt.__modesWrapped = true;
    window.buildGeminiPrompt = wrappedBuildPrompt;
  }

  function triggerFollowUpRecommendation(extraHint, statusLabel) {
    const recBtn = document.getElementById("recommendBtn");
    const statusEl = document.getElementById("aiStatus");
    if (!recBtn) return;

    activeExtraPromptHint = extraHint || "";
    if (statusEl && statusLabel) {
      statusEl.textContent = statusLabel;
    }
    recBtn.click();
    scheduleHintReset();
  }

  function appendClusterFollowUpButtons(container) {
    if (!container) return;

    container.querySelectorAll(".cluster-block").forEach((block) => {
      const header = block.querySelector(".cluster-header");
      const titleEl = block.querySelector(".cluster-title");
      const descEl = block.querySelector(".cluster-desc");
      if (!header || !titleEl || header.querySelector(".cluster-followup-actions")) return;

      const clusterName = (titleEl.textContent || "").trim();
      const clusterDesc = (descEl?.textContent || "").trim();

      const actionsWrap = document.createElement("div");
      actionsWrap.className = "actions cluster-followup-actions";
      actionsWrap.style.marginTop = "8px";

      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "secondary cluster-followup-btn";
      moreBtn.textContent = "Mehr wie dieses Cluster";
      moreBtn.addEventListener("click", () => {
        const hint =
          "Schlage weitere Titel im Cluster-Stil „" +
          clusterName +
          "“ vor" +
          (clusterDesc ? " (" + clusterDesc + ")" : "") +
          ".";
        triggerFollowUpRecommendation(hint, "Suche weitere Titel passend zu „" + clusterName + "“...");
      });

      const calmerBtn = document.createElement("button");
      calmerBtn.type = "button";
      calmerBtn.className = "secondary cluster-followup-btn";
      calmerBtn.textContent = "Ruhiger & düsterer";
      calmerBtn.addEventListener("click", () => {
        const hint =
          "Bleib grob in der Richtung von „" +
          clusterName +
          "“, aber wähle ruhigere, bedachtere und düsterere Stoffe mit weniger Hektik.";
        triggerFollowUpRecommendation(hint, "Suche ruhigere, düsterere Titel zu „" + clusterName + "“...");
      });

      actionsWrap.append(moreBtn, calmerBtn);
      header.append(actionsWrap);
    });
  }

  const baseRenderRecs = typeof window.renderRecommendations === "function" ? window.renderRecommendations : null;
  if (baseRenderRecs && !baseRenderRecs.__modesWrapped) {
    const wrappedRenderRecs = function (container, recs) {
      baseRenderRecs.call(this, container, recs);
      if (Array.isArray(recs) && recs.length > 0) {
        appendClusterFollowUpButtons(container);
      }
    };
    wrappedRenderRecs.__modesWrapped = true;
    window.renderRecommendations = wrappedRenderRecs;
  }

  function loadStoredDynamicPresets() {
    try {
      const raw = JSON.parse(localStorage.getItem(DYNAMIC_PRESETS_STORAGE) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((item) => item && item.label && item.moodText)
        .slice(0, 8)
        .map((item, idx) => ({
          id: "dyn_" + idx + "_" + String(item.label).slice(0, 12),
          label: String(item.label).trim().slice(0, 32),
          moodText: String(item.moodText).trim(),
          promptHint: String(item.promptHint || item.moodText).trim()
        }));
    } catch {
      return [];
    }
  }

  function saveStoredDynamicPresets(presets) {
    localStorage.setItem(DYNAMIC_PRESETS_STORAGE, JSON.stringify(presets));
  }

  function clearStoredDynamicPresets() {
    localStorage.removeItem(DYNAMIC_PRESETS_STORAGE);
  }

  function buildDynamicPresetsPrompt(count = 5) {
    const seed = RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)];
    const ratingMap = typeof seenRatings === "object" && seenRatings ? seenRatings : {};
    const entries = Array.isArray(typeof seenEntries !== "undefined" ? seenEntries : null) ? seenEntries : [];
    const watchlist = Array.isArray(typeof items !== "undefined" ? items : null) ? items : [];

    const superTitles = entries
      .filter((e) => {
        const t = String(e?.title || "").trim();
        if (!t) return false;
        const r = typeof getTitleRating === "function" ? getTitleRating(t) : ratingMap[t.toLocaleLowerCase("de-DE")];
        return r === "Finde ich super";
      })
      .slice(-8)
      .map((e) => String(e.title).trim());

    const dislikedTitles = entries
      .filter((e) => {
        const t = String(e?.title || "").trim();
        if (!t) return false;
        const r = typeof getTitleRating === "function" ? getTitleRating(t) : ratingMap[t.toLocaleLowerCase("de-DE")];
        return r === "Gefällt mir nicht";
      })
      .slice(-8)
      .map((e) => String(e.title).trim());

    const sampleWatchlist = watchlist.slice(0, 10).map((i) => String(i?.title || "").trim()).filter(Boolean);

    return [
      "Du bist ein Kurator für Filme und Serien in Deutschland.",
      "Erzeuge " + count + " abwechslungsreiche, kreative Schnell-Preset-Buttons für die Stimmungssuche eines Nutzers.",
      "Zufalls-Impuls für diese Runde: " + seed + " (Zufallszahl: " + Math.floor(Math.random() * 10000) + ").",
      "Top-Favoriten ('Finde ich super'): " + (superTitles.length ? superTitles.join(", ") : "keine angegeben") + ".",
      "Vermeiden ('Gefällt mir nicht'): " + (dislikedTitles.length ? dislikedTitles.join(", ") : "keine angegeben") + ".",
      "Aus der Merkliste: " + (sampleWatchlist.length ? sampleWatchlist.join(", ") : "keine angegeben") + ".",
      "Regeln: Jedes Preset braucht ein kurzes, prägnantes 'label' (max. 2–4 Wörter auf Deutsch), einen klaren 'moodText' (1 kurzer Satz für das Suchfeld) und einen konkreten 'promptHint' (1–2 Sätze als Steuerungs-Hinweis für spätere Empfehlungen, ohne technische Kamera-/Ton-Begriffe).",
      "Antworte ausschließlich als reines JSON-Array ohne Markdown oder Zusatztext:",
      '[{"label":"Kurz-Label","moodText":"Kurzer Stimmungstext","promptHint":"Konkreter Steuerungs-Hinweis für Empfehlungen."}]'
    ].join(" ");
  }

  async function generateRandomPresetsFromGemini(count = 5) {
    const apiKey = typeof getApiKey === "function" ? getApiKey() : (localStorage.getItem("watchlist_kurator_gemini_api_key_v1") || "");
    if (!apiKey) {
      const shuffled = [...FALLBACK_RANDOM_PRESETS].sort(() => Math.random() - 0.5).slice(0, count);
      return { presets: shuffled, usedFallback: true, reason: "Kein API-Key hinterlegt" };
    }

    const models = typeof GEMINI_MODELS !== "undefined" && Array.isArray(GEMINI_MODELS)
      ? GEMINI_MODELS
      : ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
    const host = typeof GEMINI_API_HOST !== "undefined" ? GEMINI_API_HOST : "generativelanguage.googleapis.com";
    const prompt = buildDynamicPresetsPrompt(count);

    for (const model of models) {
      try {
        const url = "https://" + host + "/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(apiKey);
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } }
          })
        });
        const rawBody = await res.text();
        const data = typeof parseApiResponseText === "function"
          ? parseApiResponseText(rawBody, res.status)
          : JSON.parse(rawBody);
        if (!res.ok) continue;

        const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("\n").trim();
        const cleaned = typeof extractJsonArrayText === "function" ? extractJsonArrayText(text) : text;
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .filter((item) => item && item.label && item.moodText)
            .slice(0, count)
            .map((item, idx) => ({
              id: "dyn_" + Date.now() + "_" + idx,
              label: String(item.label).trim().slice(0, 32),
              moodText: String(item.moodText).trim(),
              promptHint: String(item.promptHint || item.moodText).trim()
            }));
          if (normalized.length > 0) {
            return { presets: normalized, usedFallback: false, model };
          }
        }
      } catch {
        // Nächstes Modell versuchen
      }
    }

    const shuffled = [...FALLBACK_RANDOM_PRESETS].sort(() => Math.random() - 0.5).slice(0, count);
    return { presets: shuffled, usedFallback: true, reason: "KI-Antwort nicht verwertbar" };
  }

  function renderPresetBarButtons(bar, presets, moodEl, statusEl, isDynamicSet) {
    const recBtn = document.getElementById("recommendBtn");
    bar.querySelectorAll("button[data-preset-item='true']").forEach((el) => el.remove());

    const rollBtn = bar.querySelector("button[data-roll-presets='true']");
    let resetBtn = bar.querySelector("button[data-reset-presets='true']");

    if (isDynamicSet && !resetBtn) {
      resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "secondary";
      resetBtn.dataset.resetPresets = "true";
      resetBtn.textContent = "Standard-Presets";
      resetBtn.title = "Zurück zu den festen Presets";
      resetBtn.addEventListener("click", () => {
        clearStoredDynamicPresets();
        activeExtraPromptHint = "";
        window.__activeDynamicPresetHint = "";
        renderPresetBarButtons(bar, QUICK_PRESETS, moodEl, statusEl, false);
        if (statusEl) statusEl.textContent = "Standard-Presets wiederhergestellt.";
      });
      if (rollBtn) {
        bar.insertBefore(resetBtn, rollBtn);
      } else {
        bar.append(resetBtn);
      }
    } else if (!isDynamicSet && resetBtn) {
      resetBtn.remove();
    }

    presets.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "secondary";
      btn.dataset.presetItem = "true";
      btn.textContent = preset.label;
      btn.title = preset.moodText || preset.label;
      btn.addEventListener("click", () => {
        const resolved = typeof preset.resolveDynamic === "function" ? preset.resolveDynamic() : preset;
        const currentMood = moodEl.value.trim();
        if (resolved.moodText) {
          moodEl.value = currentMood && !currentMood.includes(resolved.moodText)
            ? currentMood + " – " + resolved.moodText
            : resolved.moodText;
        }
        if (isDynamicSet) {
          activeExtraPromptHint = "";
          window.__activeDynamicPresetHint = String(resolved.promptHint || resolved.moodText || "").trim();
          if (statusEl) {
            statusEl.textContent = "Zufalls-Preset aktiv: „" + preset.label + "“";
          }
        } else {
          activeExtraPromptHint = resolved.promptHint || "";
          window.__activeDynamicPresetHint = "";
        }
        moodEl.dispatchEvent(new Event("input", { bubbles: true }));
        moodEl.focus();
      });

      const insertBeforeTarget = resetBtn || rollBtn;
      if (insertBeforeTarget) {
        bar.insertBefore(btn, insertBeforeTarget);
      } else {
        bar.append(btn);
      }
    });

    if (recBtn && !recBtn.dataset.presetResetBound) {
      recBtn.dataset.presetResetBound = "true";
      recBtn.addEventListener("click", () => {
        scheduleHintReset();
      });
    }
  }

  function initQuickPresetsAndRandomizer() {
    const moodEl = document.getElementById("moodInput");
    const recBtn = document.getElementById("recommendBtn");
    const statusEl = document.getElementById("aiStatus");
    if (!moodEl || !recBtn) return;

    let bar = document.getElementById("quickPresetsBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "quickPresetsBar";
      bar.className = "actions";
      bar.style.marginTop = "10px";
      bar.style.flexWrap = "wrap";

      const aiTopRow = moodEl.closest(".row.ai-top");
      if (aiTopRow) {
        aiTopRow.insertAdjacentElement("afterend", bar);
      } else {
        moodEl.insertAdjacentElement("afterend", bar);
      }
    }

    if (!bar.querySelector("button[data-roll-presets='true']")) {
      const rollBtn = document.createElement("button");
      rollBtn.type = "button";
      rollBtn.className = "secondary";
      rollBtn.dataset.rollPresets = "true";
      rollBtn.textContent = "🎲 Zufalls-Presets";
      rollBtn.addEventListener("click", async () => {
        rollBtn.disabled = true;
        const prevText = rollBtn.textContent;
        rollBtn.textContent = "Würfle...";
        if (statusEl) statusEl.textContent = "Generiere neue Zufalls-Presets per KI...";

        const result = await generateRandomPresetsFromGemini(5);
        saveStoredDynamicPresets(result.presets);
        renderPresetBarButtons(bar, result.presets, moodEl, statusEl, true);

        if (statusEl) {
          statusEl.textContent = result.usedFallback
            ? "Lokale Zufalls-Presets geladen (" + result.reason + ")."
            : "Neue KI-Zufalls-Presets erstellt (" + result.model + ").";
        }
        rollBtn.textContent = prevText;
        rollBtn.disabled = false;
      });

      bar.append(rollBtn);

      const stored = loadStoredDynamicPresets();
      if (stored.length > 0) {
        renderPresetBarButtons(bar, stored, moodEl, statusEl, true);
      } else {
        renderPresetBarButtons(bar, QUICK_PRESETS, moodEl, statusEl, false);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initQuickPresetsAndRandomizer);
  } else {
    initQuickPresetsAndRandomizer();
  }
})();
