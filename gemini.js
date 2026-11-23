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

function buildAvailabilityCheckUrl(title, provider) {
  const queryParts = [stripMarkdown(title)];
  if (provider && provider !== "Sonstiges") {
    if (provider === "Tresat") queryParts.push("3sat Mediathek");
    else if (["ARD", "ZDF", "Joyn", "Netzkino"].includes(provider)) queryParts.push(provider + " Mediathek");
    else queryParts.push(provider);
  }
  return "https://www.google.com/search?q=" + encodeURIComponent(queryParts.join(" "));
}

function buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled }) {
  const providerHint = enabledProviders.length > 0
    ? "Nutze ausschließlich Anbieter aus dieser aktiven Auswahl: " + enabledProviders.join(", ") + "."
    : "Nutze passende Anbieter aus: " + providers.join(", ") + ".";
  const searchInstruction = searchEnabled
    ? "Nutze die Google-Suche, um möglichst aktuell zu prüfen, ob vorgeschlagene Titel beim jeweiligen Anbieter bzw. in Mediatheken wie Netzkino, ARD, ZDF, 3sat oder Joyn tatsächlich verfügbar sind. Wenn etwas unklar ist, kennzeichne availability ehrlich als 'Verfügbarkeit prüfen'."
    : "Gib eine realistische Einschätzung zur Verfügbarkeit an und markiere unsichere Fälle ehrlich mit 'Verfügbarkeit prüfen'.";

  return [
    "Du bist ein hilfreicher Watchlist-Kurator für Deutschland.",
    "Aktuelle Merkliste (inkl. Bewertungen): " + (titles || "keine Einträge") + ".",
    "Gesehene Titel & Bewertungen (" + seenListText + ").",
    "Geschmacksprofil & Gewichtung: Nutze vor allem 'Finde ich super' als wichtigsten Kompass für Stil, Stimmung, Dramaturgie, Spannungskurve und Themen, beziehe 'Gefällt mir' positiv ein und vermeide 'Nicht gefällt mir' sowie direkte inhaltliche oder stilistische Kopien davon.",
    "Schlage keinen Titel vor, der in 'Alle gesehenen Titel' oder in der Merkliste steht (auch nicht in leicht abweichender Schreibweise oder als bereits gesehene Staffel/Reihe).",
    "Wunsch/Stimmung: " + mood + ".",
    "Verfügbarkeits-Vorgabe: " + availMode + ".",
    providerHint,
    searchInstruction,
    "Wichtig für 'cluster' und 'clusterDesc': Formuliere 'cluster' als pointierte, prägnante Überschrift (max. 3 bis 5 Wörter) nach Inhalt, Atmosphäre oder Dramaturgie – niemals Anbieternamen oder Verfügbarkeitsbegriffe. Formuliere 'clusterDesc' als einprägsamen Einzeiler (max. 10–14 Wörter).",
    "Gib bei avHint eine kurze, unverbindliche Einschätzung zu Bild/Ton (z. B. 'HD / Stereo' oder 'UHD / 5.1 möglich').",
    "Antworte auf Deutsch mit 3 bis 4 konkreten Empfehlungen als reines JSON-Array (ohne einleitenden oder abschließenden Text) mit diesen Feldern:",
    '[{"cluster":"Pointierte Überschrift (3-5 Wörter)","clusterDesc":"Pointierter Einzeiler zum gemeinsamen Kern.","title":"Titel","type":"Film oder Serie","year":"Jahr","runtime":"z.B. 113 Min. oder 2 Staffeln","provider":"Einer aus: Sky, Netflix, ARD, ZDF, Tresat, Joyn, Netzkino, Prime Video, HBO Max, Apple TV, Rakuten TV, Sonstiges","availability":"Kurzstatus z.B. Per Suche plausibel / Mediathek / Verfügbarkeit prüfen","avHint":"z.B. HD/5.1 oder UHD/Atmos möglich","reason":"1 kurzer Satz Begründung inkl. Hinweis auf Verfügbarkeit und Bezug zu deinen Favoriten"}]'
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
  const cleaned = extractJsonArrayText(rawText);
  const parsed = JSON.parse(cleaned);
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

async function fetchGeminiRecommendations({ apiKey, mood, availMode, searchEnabled, enabledProviders, providers, titles, seenListText, onStatus, onRecommendations, onLog }) {
  const providerPool = enabledProviders.length > 0 ? enabledProviders : providers;
  onLog('Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") + ' | Modus: "' + availMode + '" | Aktive Anbieter: [' + providerPool.join(", ") + '] | Stimmung: "' + mood + '"');

  if (!apiKey) {
    onStatus("Demo-Hinweis: Für die Merkliste (" + (titles || "leer") + ") wäre ein guter nächster Titel im Bereich „" + mood + "“ ein passender Film oder eine Serie mit starker Atmosphäre. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern.");
    onLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  onStatus(searchEnabled ? "Suche im Web nach aktueller Verfügbarkeit & erstelle Vorschläge..." : "Frage Gemini an...");
  onRecommendations([]);

  const promptText = buildGeminiPrompt({ mood, availMode, enabledProviders, providers, titles, seenListText, searchEnabled });
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

      const candidate = data?.candidates?.[0];
      const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];
      if (searchEnabled) {
        if (searchQueries.length > 0) onLog("Google-Suche genutzt: " + searchQueries.join(" | "));
        else onLog("Hinweis: Keine webSearchQueries in groundingMetadata gemeldet.");
      }

      const parts = candidate?.content?.parts || [];
      const rawText = parts.map((p) => p.text || "").join("\n").trim();
      onLog("Kandidatentext erhalten (" + rawText.length + " Zeichen).");

      try {
        const parsedRecs = parseRecommendationsJson(rawText);
        if (parsedRecs) {
          localStorage.setItem(GEMINI_PREFERRED_MODEL_STORAGE, model);
          onStatus("Vorschläge erstellt (Modell: " + model + (searchEnabled ? ", mit Web-Suche" : "") + "): ");
          onRecommendations(parsedRecs);
          onLog("JSON erfolgreich geparst (" + parsedRecs.length + " Einträge). Modell für nächste Anfrage vorgemerkt: " + model);
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

function renderRecommendations(container, recs) {
  container.innerHTML = "";
}
