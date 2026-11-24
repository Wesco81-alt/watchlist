(function () {
  const REC_RATINGS = ["Gefällt mir nicht", "Gefällt mir", "Finde ich super"];

  function normalizeRecRating(val) {
    if (val === "Nicht gefällt mir") return "Gefällt mir nicht";
    return REC_RATINGS.includes(val) ? val : null;
  }

  function buildFallbackGroup(title, currentRating, onSelect) {
    const group = document.createElement("div");
    group.className = "rating-group";

    const configs = [
      { value: "Gefällt mir nicht", icon: "👎", label: "Gefällt mir nicht", activeClass: "selected-dislike" },
      { value: "Gefällt mir", icon: "👍", label: "Gefällt mir", activeClass: "selected-like" },
      { value: "Finde ich super", icon: "👍👍", label: "Finde ich super", activeClass: "selected-super" }
    ];

    configs.forEach((cfg) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rate-btn";
      if (currentRating === cfg.value) {
        btn.classList.add(cfg.activeClass);
      }
      btn.textContent = cfg.icon;
      btn.title = cfg.label;
      btn.setAttribute("aria-label", cfg.label);
      btn.addEventListener("click", () => onSelect(cfg.value));
      group.append(btn);
    });

    return group;
  }

  function enhanceRecommendationCards(container) {
    if (!container) return;
    const cards = container.querySelectorAll(".rec-card");

    cards.forEach((card) => {
      const titleEl = card.querySelector(".rec-head strong");
      if (!titleEl) return;
      const title = typeof stripMarkdown === "function"
        ? stripMarkdown(titleEl.textContent || "")
        : (titleEl.textContent || "").trim();
      if (!title) return;

      const typePill = card.querySelector(".rec-head .type-pill");
      const mediaType = typePill && typeof normalizeMediaType === "function"
        ? normalizeMediaType(typePill.textContent || "")
        : null;

      let feedbackRow = card.querySelector(".rec-feedback-row");
      if (!feedbackRow) {
        feedbackRow = document.createElement("div");
        feedbackRow.className = "rec-feedback-row";
        card.append(feedbackRow);
      }

      const oldGroup = feedbackRow.querySelector(".rating-group");
      if (oldGroup) oldGroup.remove();

      const currentRating = typeof getTitleRating === "function"
        ? normalizeRecRating(getTitleRating(title))
        : null;

      const handleSelect = (clickedRating) => {
        const nextRating = currentRating === clickedRating ? null : clickedRating;
        if (typeof setTitleRating === "function") {
          setTitleRating(title, nextRating);
        }
        if (nextRating && typeof addSeenEntry === "function") {
          addSeenEntry(title, mediaType);
        }
        if (typeof syncRecommendationHistoryFeedback === "function") {
          syncRecommendationHistoryFeedback(title, nextRating);
        }
        if (typeof renderSeenList === "function") {
          renderSeenList();
        }
        if (typeof renderList === "function") {
          renderList();
        }
        if (typeof debugLog === "function") {
          debugLog("KI-Empfehlung bewertet: " + title + " -> " + (nextRating || "Bewertung entfernt"));
        }
        enhanceRecommendationCards(container);
      };

      const group = typeof createRatingControls === "function"
        ? createRatingControls(currentRating, handleSelect)
        : buildFallbackGroup(title, currentRating, handleSelect);

      group.setAttribute("aria-label", "Bewertung für " + title);
      group.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-label", (button.title || button.textContent) + " für " + title);
      });

      const seenBtn = feedbackRow.querySelector(".seen-btn");
      if (seenBtn) {
        feedbackRow.insertBefore(group, seenBtn);
      } else {
        feedbackRow.append(group);
      }
    });
  }

  function installRecommendationRatingHook() {
    if (typeof window.renderRecommendations !== "function" || window.renderRecommendations.__ratingHooked) {
      return;
    }
    const originalRender = window.renderRecommendations;
    const wrappedRender = function (container, recs) {
      originalRender.call(this, container, recs);
      enhanceRecommendationCards(container);
    };
    wrappedRender.__ratingHooked = true;
    window.renderRecommendations = wrappedRender;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installRecommendationRatingHook);
  } else {
    installRecommendationRatingHook();
  }
})();
