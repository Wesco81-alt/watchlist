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
const RECOMMENDATION_COUNT_STORAGE = "watchlist_kurator_recommendation_count_v1";
const DEFAULT_RECOMMENDATION_COUNT = 4;
const MIN_RECOMMENDATION_COUNT = 1;
const MAX_RECOMMENDATION_COUNT = 10;

function normalizeSuggestedTitle(title) {
  return stripMarkdown(title).replace(/\s+/g, " ").trim();
}

function titleKey(title) {
  return normalizeSuggestedTitle(title).toLocaleLowerCase("de-DE");
}

function getRecommendationCount() {
  const stored = Number(localStorage.getItem(RECOMMENDATION_COUNT_STORAGE));
  if (!Number.isInteger(stored)) return DEFAULT_RECOMMENDATION_COUNT;
  return Math.min(MAX_RECOMMENDATION_COUNT, Math.max(MIN_RECOMMENDATION_COUNT, stored));
}

function initializeRecommendationCountSetting() {
  const apiView = document.getElementById("apiView");
  if (!apiView || document.getElementById("recommendationCountInput")) return;

  const card = document.createElement("section");
  card.className = "card";
  card.style.marginTop = "16px";
  const heading = document.createElement("h2");
  heading.textContent = "KI-Empfehlungen";
  const description = document.createElement("div");
  description.className = "meta";
  description.textContent = "Lege fest, wie viele Titel die KI pro Anfrage vorschlagen soll (1–10). Die Einstellung wird lokal gespeichert.";

  const row = document.createElement("div");
  row.className = "row";
  row.style.marginTop = "10px";
  const label = document.createElement("label");
  label.className = "meta";
  label.htmlFor = "recommendationCountInput";
  label.textContent = "Anzahl der Vorschläge:";
  const input = document.createElement("input");
  input.id = "recommendationCountInput";
  input.type = "number";
  input.min = String(MIN_RECOMMENDATION_COUNT);
  input.max = String(MAX_RECOMMENDATION_COUNT);
  input.step = "1";
  input.value = String(getRecommendationCount());
  input.setAttribute("aria-label", "Anzahl der KI-Empfehlungen");
  input.style.width = "100px";
  const status = document.createElement("div");
  status.id = "recommendationCountStatus";
  status.className = "status-msg";
  status.textContent = "Aktuell eingestellt: " + input.value;

  const saveCount = () => {
    const parsed = Number(input.value);
    if (!Number.isInteger(parsed) || parsed < MIN_RECOMMENDATION_COUNT || parsed > MAX_RECOMMENDATION_COUNT) {
      status.textContent = "Bitte eine ganze Zahl zwischen 1 und 10 eingeben.";
      return;
    }
    localStorage.setItem(RECOMMENDATION_COUNT_STORAGE, String(parsed));
    status.textContent = "Gespeichert: " + parsed + (parsed === 1 ? " Vorschlag pro Anfrage." : " Vorschläge pro Anfrage.");
  };
  input.addEventListener("change", saveCount);
  input.addEventListener("blur", saveCount);
  row.append(label, input);
  card.append(heading, description, row, status);

  const debugSection = Array.from(apiView.querySelectorAll("section.card"))
    .find((section) => section.querySelector("#debugOutput"));
  if (debugSection) apiView.insertBefore(card, debugSection);
  else apiView.append(card);
}

initializeRecommendationCountSetting();

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
  recs.forEach((rec) => {
    const title = normalizeSuggestedTitle(rec?.title || "");
    const key = titleKey(title);
    if (!key) return;
    const existingIndex = history.findIndex((entry) => titleKey(entry.title) === key);
    if (existingIndex >= 0) history[existingIndex].suggestedAt = now;
    else history.unshift({ title, suggestedAt: now, feedback: null });
  });
  saveRecommendationHistory(history);
  return recs.length;
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
  const providerHint = enabledProviders.length > 0
    ? "Nutze ausschließlich Anbieter aus dieser aktiven Auswahl: " + enabledProviders.join(", ") + "."
    : "Nutze passende Anbieter aus: " + providers.join(", ") + ".";
  const repeatInstruction = recentRecommendationTitles.length
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
    "Schlage keinen Titel aus der Merkliste oder der gesehenen Liste vor.",
    "Formuliere 'cluster' als pointierte Überschrift mit maximal 3 bis 5 Wörtern. Formuliere 'clusterDesc' als einprägsamen Einzeiler mit maximal 10 bis 14 Wörtern.",
    "Gib bei avHint eine kurze Einschätzung zu Bild/Ton an.",
    "Antworte auf Deutsch mit genau " + recommendationCount + " konkreten Empfehlungen als reines JSON-Array ohne einleitenden oder abschließenden Text:",
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
      feedbackRow.append(createSeenButton(title, mediaType));
      card.append(feedbackRow);
      clusterBlock.append(card);
    }
    container.append(clusterBlock);
  }
}

async function fetchGeminiRecommendations({ apiKey, mood, availMode, searchEnabled, enabledProviders, providers, titles, seenListText, recommendationCount = DEFAULT_RECOMMENDATION_COUNT, onStatus, onRecommendations, onLog }) {
  const providerPool = enabledProviders.length > 0 ? enabledProviders : providers;
  const count = Math.min(MAX_RECOMMENDATION_COUNT, Math.max(MIN_RECOMMENDATION_COUNT, Number(recommendationCount) || DEFAULT_RECOMMENDATION_COUNT));
  onLog('Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") + ' | Anzahl: ' + count + ' | Modus: "' + availMode + '" | Aktive Anbieter: [' + providerPool.join(", ") + '] | Stimmung: "' + mood + '"');
  if (!apiKey) {
    onStatus("Demo-Hinweis: Für die Merkliste (" + (titles || "leer") + ") wäre ein passender nächster Titel im Bereich „" + mood + "“. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern.");
    onLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  const recentRecommendationTitles = getRecentRecommendationTitles();
  const requestTimeoutMs = searchEnabled ? GEMINI_SEARCH_REQUEST_TIMEOUT_MS : GEMINI_REQUEST_TIMEOUT_MS;
  onLog("Wiederholungsschutz: " + recentRecommendationTitles.length + " Titel für " + RECOMMENDATION_COOLDOWN_DAYS + " Tage ausgeblendet.");
  onLog("Anfrage-Timeout: " + (requestTimeoutMs / 1000) + "s | Gewünschte Vorschläge: " + count);
  onStatus("Frage Gemini nach " + count + " Vorschlägen" + (searchEnabled ? " mit Websuche..." : "...") );
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
    const requestStartedAt = performance.now();
    let requestPhase = "Warten auf HTTP-Header";
    let receivedResponseBytes = 0;
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { maxOutputTokens: 2048 }
    };
    if (searchEnabled) requestBody.tools = [{ google_search: {} }];
    else requestBody.generationConfig.thinkingConfig = { thinkingBudget: 0 };

    onStatus("Prüfe Modell " + (idx + 1) + "/" + maxAttempts + ": " + model);
    onLog("Versuch " + (idx + 1) + "/" + maxAttempts + ": POST " + endpoint + " | Timeout: " + (requestTimeoutMs / 1000) + "s");
    try {
      const res = await fetch(requestUrl, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(requestBody) });
      requestPhase = "Lesen des Antwortkörpers";
      const contentLength = res.headers.get("content-length");
      onLog("HTTP-Header nach " + ((performance.now() - requestStartedAt) / 1000).toFixed(2) + "s; Content-Length: " + (contentLength || "unbekannt"));
      let rawBody;
      if (res.body?.getReader) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        rawBody = "";
        let lastProgressLogAt = performance.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          receivedResponseBytes += value.byteLength;
          rawBody += decoder.decode(value, { stream: true });
          if (performance.now() - lastProgressLogAt >= 5000) {
            onLog("Antwortkörper wird übertragen: " + receivedResponseBytes + " Bytes nach " + ((performance.now() - requestStartedAt) / 1000).toFixed(1) + "s.");
            lastProgressLogAt = performance.now();
          }
        }
        rawBody += decoder.decode();
      } else {
        rawBody = await res.text();
        receivedResponseBytes = new TextEncoder().encode(rawBody).length;
      }
      onLog("Antwort von " + model + ": HTTP " + res.status + ", " + receivedResponseBytes + " Bytes, Gesamtdauer " + ((performance.now() - requestStartedAt) / 1000).toFixed(2) + "s");
      const data = parseApiResponseText(rawBody, res.status);
      if (!res.ok) throw new Error((data?.error?.message || ("HTTP " + res.status)) + " [Status " + res.status + "]");

      const parts = data?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.map((p) => p.text || "").join("\n").trim();
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
      const elapsedSeconds = ((performance.now() - requestStartedAt) / 1000).toFixed(2);
      if (err?.name === "AbortError") onLog("Timeout bei " + model + " nach " + elapsedSeconds + "s; Phase: " + requestPhase + "; empfangene Bytes: " + receivedResponseBytes + ".");
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
        onLog("Fallback aktiv -> " + (status === 400 ? "ungültiges Modell oder Argument" : "warte " + GEMINI_RETRY_DELAY_MS + "ms") + " und wechsle von " + model + " auf " + nextModel);
        if (status !== 400) await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_DELAY_MS));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") onStatus("Zeitüberschreitung nach " + (requestTimeoutMs / 1000) + " Sekunden je Modell (getestet: " + attemptedModels.join(" -> ") + "). Details stehen im Debug-Log.");
  else onStatus("Fehler bei allen getesteten Modellen (" + attemptedModels.join(" -> ") + "): " + (lastError?.message || "Kontingent erschöpft oder aktuell ausgelastet."));
}
