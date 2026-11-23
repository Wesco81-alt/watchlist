const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-4-hydrogen",
  "gemini-3.6-flash",
  "gemini-3.8-flash"
];
const GEMINI_API_HOST = "generativelanguage.googleapis.com";
const GEMINI_REQUEST_TIMEOUT_MS = 45000;

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
    "Wichtig für 'cluster' und 'clusterDesc': Formuliere 'cluster' als pointierte, prägnante Überschrift (max. 3 bis 5 Wörter, z. B. 'Kalte Rätsel im Nebel' oder 'Gnadenlose Doppelböden') nach Inhalt, Atmosphäre oder Dramaturgie – niemals bloß Anbieternamen, Mediatheken oder Verfügbarkeits-Begriffe. Formuliere 'clusterDesc' als scharfen, einprägsamen Einzeiler (max. 10–14 Wörter), der den gemeinsamen Kern der Titel auf den Punkt bringt.",
    "Gib bei avHint eine kurze, unverbindliche Einschätzung zu Bild/Ton (z. B. 'HD / Stereo' oder 'UHD / 5.1 möglich').",
    "Antworte auf Deutsch mit 3 bis 4 konkreten Empfehlungen als reines JSON-Array (ohne einleitenden oder abschließenden Text) mit diesen Feldern:",
    '[{"cluster":"Pointierte Überschrift (3-5 Wörter)","clusterDesc":"Pointierter Einzeiler zum gemeinsamen Kern.","title":"Titel","type":"Film oder Serie","year":"Jahr","runtime":"z.B. 113 Min. oder 2 Staffeln","provider":"Einer aus: Sky, Netflix, ARD, ZDF, Tresat, Joyn, Netzkino, Prime Video, HBO Max, Apple TV, Rakuten TV, Sonstiges","availability":"Kurzstatus z.B. Per Suche plausibel / Mediathek / Verfügbarkeit prüfen","avHint":"z.B. HD/5.1 oder UHD/Atmos möglich","reason":"1 kurzer Satz Begründung inkl. Hinweis auf Verfügbarkeit und Bezug zu deinen Favoriten"}]'
  ].join(" ");
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

function renderRecommendations(container, recs) {
  container.innerHTML = "";
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

    container.append(clusterBlock);
  }
}

async function fetchGeminiRecommendations({
  apiKey,
  mood,
  availMode,
  searchEnabled,
  enabledProviders,
  providers,
  titles,
  seenListText,
  onStatus,
  onRecommendations,
  onLog
}) {
  const providerPool = enabledProviders.length > 0 ? enabledProviders : providers;
  onLog(
    'Starte Empfehlung | Web-Suche: ' + (searchEnabled ? "AN" : "AUS") +
    ' | Modus: "' + availMode +
    '" | Aktive Anbieter: [' + providerPool.join(", ") +
    '] | Stimmung: "' + mood + '"'
  );

  if (!apiKey) {
    onStatus(
      "Demo-Hinweis: Für die Merkliste (" + (titles || "leer") +
      ") wäre ein guter nächster Titel im Bereich „" + mood +
      "“ ein passender Film oder eine Serie mit starker Atmosphäre. Für echte Gemini-Antworten bitte unter „API & Debug“ einen Key speichern."
    );
    onLog("Kein API-Key vorhanden -> Demo-Ausgabe.");
    return;
  }

  onStatus(
    searchEnabled
      ? "Suche im Web nach aktueller Verfügbarkeit & erstelle Vorschläge..."
      : "Frage Gemini an..."
  );
  onRecommendations([]);

  const promptText = buildGeminiPrompt({
    mood,
    availMode,
    enabledProviders,
    providers,
    titles,
    seenListText,
    searchEnabled
  });

  const attemptedModels = [];
  let lastError = null;

  for (let idx = 0; idx < GEMINI_MODELS.length; idx++) {
    const model = GEMINI_MODELS[idx];
    attemptedModels.push(model);
    const endpoint = "https://" + GEMINI_API_HOST + "/v1beta/models/" + model + ":generateContent";
    const requestUrl = endpoint + "?key=" + encodeURIComponent(apiKey);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

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

    onLog(
      "Versuch " + (idx + 1) + "/" + GEMINI_MODELS.length +
      ": POST " + endpoint + " | Web-Suche: " + (searchEnabled ? "ja" : "nein")
    );

    try {
      const res = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      });
      const rawBody = await res.text();
      onLog("Antwort von " + model + ": HTTP " + res.status + ", Länge: " + rawBody.length + " Zeichen");
      const data = parseApiResponseText(rawBody, res.status);
      if (!res.ok) {
        const apiMsg = data?.error?.message || ("HTTP " + res.status);
        throw new Error(apiMsg + " [Status " + res.status + "]");
      }
      const candidate = data?.candidates?.[0];
      const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];
      if (searchEnabled) {
        if (searchQueries.length > 0) {
          onLog("Google-Suche genutzt: " + searchQueries.join(" | "));
        } else {
          onLog("Hinweis: Keine webSearchQueries in groundingMetadata gemeldet.");
        }
      }
      const parts = candidate?.content?.parts || [];
      const rawText = parts.map((p) => p.text || "").join("\n").trim();
      onLog("Kandidatentext erhalten (" + rawText.length + " Zeichen).");
      try {
        const parsedRecs = parseRecommendationsJson(rawText);
        if (parsedRecs) {
          onStatus("Vorschläge erstellt (Modell: " + model + (searchEnabled ? ", mit Web-Suche" : "") + "):");
          onRecommendations(parsedRecs);
          onLog("JSON erfolgreich geparst (" + parsedRecs.length + " Einträge).");
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

      const msg = String(err.message || "");
      const isFallbackWorthwhile =
        err.name === "AbortError" ||
        /high demand|overloaded|503|500|429|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|exceeded|rate|limit/i.test(msg);

      if (!isFallbackWorthwhile) {
        clearTimeout(timeoutId);
        onStatus("Fehler bei der Gemini-Anfrage (" + model + "): " + msg);
        return;
      }

      if (idx < GEMINI_MODELS.length - 1) {
        onLog("Fallback aktiv -> wechsle von " + model + " auf " + GEMINI_MODELS[idx + 1]);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError?.name === "AbortError") {
    onStatus("Zeitüberschreitung nach " + (GEMINI_REQUEST_TIMEOUT_MS / 1000) + " Sekunden (getestet: " + attemptedModels.join(" -> ") + ").");
  } else {
    onStatus(
      "Fehler bei allen getesteten Modellen (" + attemptedModels.join(" -> ") + "): " +
      (lastError?.message || "Kontingent erschöpft oder aktuell ausgelastet.")
    );
  }
}
