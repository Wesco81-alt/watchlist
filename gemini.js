const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite"
];
const GEMINI_API_HOST = "generativelanguage.googleapis.com";
const GEMINI_REQUEST_TIMEOUT_MS = 45000;
const GEMINI_RETRY_DELAY_MS = 2000;
const GEMINI_MAX_FALLBACKS = 2;
const GEMINI_PREFERRED_MODEL_STORAGE = "watchlist_kurator_gemini_preferred_model_v1";
const RECOMMENDATION_HISTORY_STORAGE = "watchlist_kurator_recommendation_history_v1";
const RECOMMENDATION_COOLDOWN_DAYS = 60;
const RECOMMENDATION_HISTORY_MAX = 500;

function normalizeSuggestedTitle(title) {
  return stripMarkdown(title).replace(/\s+/g, " ").trim();
}

function titleKey(title) {
  return normalizeSuggestedTitle(title).toLocaleLowerCulture("de-DE").toLowerCase();
}

function loadRecommendationHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECOMMENDATION_HISTORY_STORAGE) || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && entry.title && entry.suggestedAt) : [];
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

function getRecentRecommendationTitles() {
  const cutoff = Date.now() - RECOMMENDATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return loadRecommendationHistory()
    .filter((entry) => new Date(entry.suggestedAt).getTime() >= cutoff)
    .map((entry) => normalizeSuggestedTitle(entry.title));
}

function recordRecommendations(recs) {
  if (!Array.isArray(recs)) return 0;
  const history = loadRecommendationHistory();
  const now = new Date().toISOString();
  const keysBefore = new Set(history.map((entry) => titleKey(entry.title)));
  let added = 0;
  recs.forEach((rec) => {
    const title = normalizeSuggestedTitle(rec?.title || "");
    const key = titleKey(title);
    if (!key) return;
    const existingIndex = history.findIndex((entry) => titleKey(entry.title) === key);
    if (existingIndex >= 0) {
      history[existingIndex].suggestedAt = now;
    } else {
      history.unshift({ title, suggestedAt: now, feedback: null });
      added += 1;
    }
  });
  saveRecommendationHistory(history);
  return added || (recs.length > 0 ? recs.length : 0);
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

function buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled, recentRecommendationTitles }) {
  const providerHint = enabledProviders.length > 0
    ? "Nutze ausschließlich Anbieter aus dieser aktiven Auswahl: " + enabledProviders.join(", ") + "."
    : "Nutze passende Anbieter aus: " + providers.join(", ") + ".";
  const repeatInstruction = recentRecommendationTitles?.length
    ? "Vermeide diese Titel, die kürzlich bereits vorgeschlagen wurden: " + recentRecommendationTitles.join(", ") + ". Falls keine ausreichende Vielfalt möglich ist, bleibe bei der abschließenden Empfehlungspflicht."
    : "Es gibt keine kürzlich vorgeschlagenen Titel, die vermieden werden müssten.";
  const searchInstruction = searchEnabled
    ? "Nutze die Google-Suche, um möglichst aktuell zu prüfen, ob vorgeschlagene Titel beim jeweiligen Anbieter bzw. in Mediatheken tatsächlich verfügbar sind. Wenn etwas unklar ist, kennzeichne availability ehrlich als 'Verfügbarkeit prüfen'."
    : "Gib eine realistische Einschätzung zur Verfügbarkeit an und markiere unsichere Fälle ehrlich mit 'Verfügbarkeit prüfen'.";

  return [
    "Du bist ein hilfreicher Watchlist-Kurator für Deutschland.",
    "Aktuelle Merkliste (inkl. Bewertungen): " + (titles || "keine Einträge") + ".",
    "Gesehene Titel & Bewertungen (" + seenListText + ").",
    repeatInstruction,
    "Wunsch/Stimmung: " + mood + ".",
    "Verfügbarkeits-Vorgabe: " + availMode + ".",
    providerHint,
    searchInstruction,
    "Schlage keine Titel aus der Merkliste oder der gesehenen Liste vor.",
    "Formuliere 'cluster' als pointierte Überschrift mit maximal 3 bis 5 Wörtern. Formuliere 'clusterDesc' als einprägsamen Einzeiler mit maximal 10 bis 14 Wörtern.",
    "Gib bei avHint eine kurze Einschätzung zu Bild/Ton an.",
    "Antworte auf Deutsch mit 3 bis 4 konkreten Empfehlungen als reines JSON-Array ohne einleitenden oder abschließenden Text:",
    '[{"cluster":"Pointierte Überschrift","clusterDesc":"Gemeinsamer Kern","title":"Titel","type":"Film oder Serie","year":"Jahr","runtime":"Laufzeit oder Staffeln","provider":"Anbieter","availability":"Kurzstatus","avHint":"Bild/Ton","reason":"Kurze Begründung"}]'
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
      const availability = stripMarkdown(rec.availability || "Verfügbarkeit prüfen");
      const runtime = stripMarkdown(rec.runtime || "");
      const avHint = stripMarkdown(rec.avHint || "");
      const reason = stripMarkdown(rec.reason || "");
      let chosenRating = null;

      const card = document.createElement("div");
      card.className = "rec-card";
      const head = document.createElement("div");
      head.className = "rec-head";
      const titleWrap = document.createElement("div");
      titleWrap.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" +
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
      if (metaParts.length) {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = metaParts.join(" · ");
        card.append(meta);
      }
      if (reason) {
        const body = document.createElement("div");
        body.textContent = reason;
        card.append(body);
      }

      const feedbackRow = document.createElement("div");
      feedbackRow.className = "rec-feedback-row";
      const seenBtn = createSeenButton(title, mediaType);
      feedbackRow.append(seenBtn);

      card.prepend(head);
      card.append(feedbackRow);
      clusterBlock.append(card);
    }
    container.append(clusterBlock);
  }
}

async function fetchGeminiRecommendations({ apiKey, mood, availMode, searchEnabled, enabledProviders, providers, titles, seenListText, onStatus, onRecommendations, onLog }) {
  const providerPool = enabledProviders.length > 0 ? enabledProviders : providers;
  onLog('Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") + ' | Modus: "' + availMode + '" | Aktive Anbieter: [' + providerPool.join(", ") + '] | Stimmung: "' + mood + '"');

  if (!apiKey) {
    onStatus("Demo-Hinweis: Für die Merkliste (" + (titles || "leer") + ") wäre ein guter nächster Titel im Bereich „" + mood + "“ ein passender Film oder eine Serie. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern.");
    onLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  const recentRecommendationTitles = getRecentRecommendationTitles();
  onStatus(searchEnabled ? "Suche im Web nach aktueller Verfügbarkeit & erstelle Vorschläge..." : "Frage Gemini an...");
  onRecommendations([]);

  const promptText = buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled, recentRecommendationTitles });
  const orderedModels = getOrderedGeminiModels();
  const maxAttempts = Math.min(1 + GEMINI_MAX_FALLBACKS, orderedModels.length);
  const attemptedModels = [];
  let lastError = null;

  onLog("Wiederholungsschutz: " + recentRecommendationTitles.length + " Titel für " + RECOMMENDATION_COOLDOWN_DAYS + " Tage ausgeblendet.");

  for (let idx = 0; idx < maxAttempts; idx++) {
    const model = orderedModels[idx];
    attemptedModels.push(model);
    const endpoint = "https://" + GEMINI_API_HOST + "/v1beta/models/" + model + ":generateContent";
    const requestUrl = endpoint + "?key=" + encodeURIComponent(apiKey);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    const requestBody = { contents: [{ parts: [{ text: promptText }] }] };
    if (searchEnabled) requestBody.tools = [{ google_search: {} }];
    else requestBody.generationConfig = { thinkingConfig: { thinkingBudget: 0 } };

    onStatus("Prüfe Modell " + (idx + 1) + "/" + maxAttempts + ": " + model);
    onLog("Versuch " + (idx + 1) + "/" + maxAttempts + ": POST " + endpoint + " | Timeout: " + (GEMINI_REQUEST_TIMEOUT_MS / 1000) + "s | Web-Suche: " + (searchEnabled ? "ja" : "nein"));

    try {
      const res = await fetch(requestUrl, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(requestBody) });
      const rawBody = await res.text();
      onLog("Antwort von " + model + ": HTTP " + res.status + ", Länge: " + rawBody.length + " Zeichen");
      const data = parseApiResponseText(rawBody, res.status);
      if (!res.ok) throw new Error((data?.error?.message || ("HTTP " + res.status)) + " [Status " + res.status + "]");

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.map((p) => p.text || "").join("\n").trim();
      onLog("Kandidatentext erhalten (" + rawText.length + " Zeichen).");

      try {
        const parsedRecs = parseRecommendationsJson(rawText);
        if (parsedRecs) {
          localStorage.setItem(GEMINI_PREFERRED_MODEL_STORAGE, model);
          recordRecommendations(parsedRecs);
          onStatus("Vorschläge erstellt (Modell: " + model + (searchEnabled ? ", mit Web-Suche" : "") + "): " + parsedRecs.length + " neue Vorschläge");
          onRecommendations(parsedRecs);
          onLog("JSON erfolgreich geparst (" + parsedRecs.length + " Einträge). Vorschlagsverlauf aktualisiert.");
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
      onLog("Fehler bei " + model + ": " + err.name + ": " + err.message);

      if (!isFallbackWorthwhile(err)) {
        clearTimeout(timeoutId);
        onStatus("Fehler bei der Gemini-Anfrage (" + model + "): " + err.message);
        return;
      }

      if (idx < maxAttempts - 1) {
        const nextModel = orderedModels[idx + 1];
        const status = getHttpStatus(err.message);
        if (status === 400) onStatus("Modell " + model + " wurde mit HTTP 400 abgelehnt – wechsle direkt zu " + nextModel);
        else onStatus("Modell " + model + " nicht verfügbar – warte " + (GEMINI_RETRY_DELAY_MS / 1000) + "s, dann " + nextModel);
        onLog("Fallback aktiv -> " + (status === 400 ? "ungültiges Modell oder Argument" : "warte " + GEMINI_RETRY_DELAY_MS + "ms") + " und wechsle von " + model + " auf " + nextModel);
        if (status !== 400) await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") onStatus("Zeitüberschreitung nach 45 Sekunden je Modell (getestet: " + attemptedModels.join(" -> ") + ").");
  else onStatus("Fehler bei allen getesteten Modellen (" + attemptedModels.join(" -> ") + "): " + (lastError?.message || "Kontingent erschöpft oder aktuell ausgelastet."));
}
