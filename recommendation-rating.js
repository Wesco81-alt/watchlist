(() => {
  const originalRenderRecommendations = renderRecommendations;

  function renderRecommendationsWithRatings(container, recs) {
    originalRenderRecommendations(container, recs);
    if (!Array.isArray(recs) || recs.length === 0) return;

    const cards = container.querySelectorAll(".rec-card");
    recs.slice(0, cards.length).forEach((rec, index) => {
      const title = stripMarkdown(rec.title || "Unbekannter Titel");
      const mediaType = normalizeMediaType(rec.type, rec);
      const card = cards[index];
      const feedbackRow = card.querySelector(".rec-feedback-row");
      if (!feedbackRow) return;

      const ratingControls = createRatingControls(getTitleRating(title), (selectedRating) => {
        const currentRating = getTitleRating(title);
        const nextRating = currentRating === selectedRating ? null : selectedRating;
        setTitleRating(title, nextRating);
        renderList();
        renderSeenList();
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
