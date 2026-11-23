(() => {
  const originalRenderRecommendations = renderRecommendations;

  function renderRecommendationsWithRatings(container, recs) {
    originalRenderRecommendations(container, recs);
    if (!Array.isArray(recs) || recs.length === 0) return;

    const cards = Array.from(container.querySelectorAll(".rec-card"));
    recs.forEach((rec, index) => {
      const card = cards[index];
      if (!card) return;

      const title = stripMarkdown(rec.title || "Unbekannter Titel");
      const mediaType = normalizeMediaType(rec.type, rec);
      const feedbackRow = card.querySelector(".rec-feedback-row");
      if (!feedbackRow) return;

      const currentRating = getTitleRating(title);
      const ratingControls = createRatingControls(currentRating, (selectedRating) => {
        const activeRating = getTitleRating(title);
        const nextRating = activeRating === selectedRating ? null : selectedRating;
        setTitleRating(title, nextRating);

        if (nextRating) {
          addSeenEntry(title, mediaType);
        }

        renderSeenList();
        renderList();
        debugLog("KI-Empfehlung bewertet: " + title + " -> " + (nextRating || "Bewertung entfernt"));
        renderRecommendationsWithRatings(container, recs);
      });

      ratingControls.setAttribute("aria-label", "Bewertung für " + title);
      ratingControls.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-label", button.title + " für " + title);
      });

      feedbackRow.prepend(ratingControls);
    });
  }

  renderRecommendations = renderRecommendationsWithRatings;
})();
