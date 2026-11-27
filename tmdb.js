const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function buildPosterUrl(posterPath, size = "w342") {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function buildBackdropUrl(backdropPath, size = "w780") {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

function mapProviders(list = []) {
  return list.map((provider) => ({
    providerId: provider.provider_id,
    name: provider.provider_name,
    logoUrl: provider.logo_path ? `${TMDB_IMAGE_BASE}/w92${provider.logo_path}` : null
  }));
}

async function fetchSearchResults({ title, type = "movie", year = null, apiKey }) {
  const mediaType = type === "tv" ? "tv" : "movie";
  const url = new URL(`${TMDB_BASE_URL}/search/${mediaType}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", title);
  url.searchParams.set("language", "de-DE");
  url.searchParams.set("include_adult", "false");

  if (year) {
    url.searchParams.set(mediaType === "tv" ? "first_air_date_year" : "year", String(year));
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB-Suche fehlgeschlagen (HTTP ${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

export async function findTmdbId({ title, type = "movie", year = null, apiKey }) {
  if (!title || !apiKey) return null;

  const mediaType = type === "tv" ? "tv" : "movie";
  let results = await fetchSearchResults({ title, type: mediaType, year, apiKey });

  if (results.length === 0 && year) {
    results = await fetchSearchResults({ title, type: mediaType, year: null, apiKey });
  }

  return results[0]?.id ?? null;
}

export async function fetchTitleEnrichment(item, apiKey) {
  if (!apiKey) {
    throw new Error("Kein TMDB-API-Schlüssel übergeben.");
  }

  const type = item?.core?.type === "tv" ? "tv" : "movie";
  const title = item?.core?.title;
  const year = item?.core?.year || null;

  const tmdbId = item?.meta?.tmdbId || (await findTmdbId({ title, type, year, apiKey }));
  if (!tmdbId) {
    return {
      meta: item?.meta || null,
      availabilityDE: item?.availabilityDE || null
    };
  }

  const detailUrl = new URL(`${TMDB_BASE_URL}/${type}/${tmdbId}`);
  detailUrl.searchParams.set("api_key", apiKey);
  detailUrl.searchParams.set("language", "de-DE");
  detailUrl.searchParams.set("append_to_response", "watch/providers");

  const detailRes = await fetch(detailUrl);
  if (!detailRes.ok) {
    throw new Error(`TMDB-Details fehlgeschlagen (HTTP ${detailRes.status})`);
  }

  const raw = await detailRes.json();
  const deProviders = raw["watch/providers"]?.results?.DE || {};
  const now = new Date().toISOString();

  return {
    meta: {
      tmdbId: raw.id,
      posterPath: raw.poster_path || null,
      backdropPath: raw.backdrop_path || null,
      overview: raw.overview || "",
      genres: Array.isArray(raw.genres) ? raw.genres.map((g) => g.name) : [],
      voteAverage: typeof raw.vote_average === "number" ? Number(raw.vote_average.toFixed(1)) : null,
      runtimeMinutes:
        type === "movie"
          ? raw.runtime || null
          : Array.isArray(raw.episode_run_time) && raw.episode_run_time.length > 0
            ? raw.episode_run_time[0]
            : null,
      seasons: type === "tv" ? raw.number_of_seasons || null : null,
      fetchedAt: now
    },
    availabilityDE: {
      region: "DE",
      link: deProviders.link || null,
      fetchedAt: now,
      flatrate: mapProviders(deProviders.flatrate),
      free: mapProviders(deProviders.free),
      ads: mapProviders(deProviders.ads),
      rent: mapProviders(deProviders.rent),
      buy: mapProviders(deProviders.buy)
    }
  };
}
