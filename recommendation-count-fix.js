(() => {
  window.GEMINI_SEARCH_REQUEST_TIMEOUT_MS = 90000;

  const storageKey = "watchlist_kurator_recommendation_count_v1";
  const originalFetchGeminiRecommendations = fetchGeminiRecommendations;

  fetchGeminiRecommendations = (args) => {
    const stored = Number(localStorage.getItem(storageKey));
    const count = Number.isInteger(stored) && stored >= 1 && stored <= 10
      ? stored
      : 4;
    return originalFetchGeminiRecommendations({
      ...args,
      recommendationCount: count
    });
  };
})();
