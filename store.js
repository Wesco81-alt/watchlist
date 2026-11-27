const STORAGE_KEY = "watchlist_kurator_items_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_META_TTL_DAYS = 30;
const DEFAULT_PROVIDERS_TTL_DAYS = 7;

let state = {
  items: new Map(),
  adapters: {
    loadAll: null,
    saveItem: null,
    deleteItem: null
  }
};

export function createTitleKey(title = "", year = "", type = "movie") {
  const cleanTitle = String(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cleanType = type === "tv" ? "tv" : "movie";
  const cleanYear = year ? String(year).trim() : "unknown";
  return `${cleanTitle || "untitled"}-${cleanYear}-${cleanType}`;
}

function persistLocal() {
  try {
    const list = Array.from(state.items.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Lokales Speichern fehlgeschlagen:", err);
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Lokales Laden fehlgeschlagen:", err);
    return [];
  }
}

export function isCacheExpired(isoTimestamp, maxAgeDays) {
  if (!isoTimestamp) return true;
  const parsed = new Date(isoTimestamp).getTime();
  if (Number.isNaN(parsed)) return true;
  return Date.now() - parsed > maxAgeDays * DAY_MS;
}

export function configureStore({ loadAll = null, saveItem = null, deleteItem = null } = {}) {
  state.adapters.loadAll = typeof loadAll === "function" ? loadAll : null;
  state.adapters.saveItem = typeof saveItem === "function" ? saveItem : null;
  state.adapters.deleteItem = typeof deleteItem === "function" ? deleteItem : null;
}

export async function initStore() {
  state.items.clear();

  for (const item of loadLocal()) {
    if (item?.id) {
      state.items.set(item.id, item);
    }
  }

  if (state.adapters.loadAll) {
    const remoteItems = await state.adapters.loadAll();
    if (Array.isArray(remoteItems)) {
      for (const item of remoteItems) {
        if (item?.id) {
          state.items.set(item.id, item);
        }
      }
      persistLocal();
    }
  }

  return getAllTitles();
}

export function getAllTitles() {
  return Array.from(state.items.values());
}

export function getTitleById(id) {
  return state.items.get(id) || null;
}

export function findTitleByKey(titleKey) {
  for (const item of state.items.values()) {
    if (item.titleKey === titleKey) return item;
  }
  return null;
}

export async function upsertTitle(input) {
  const now = new Date().toISOString();
  const type = input?.core?.type === "tv" || input?.type === "tv" ? "tv" : "movie";
  const title = (input?.core?.title ?? input?.title ?? "").trim();
  const year = input?.core?.year ?? input?.year ?? null;
  const titleKey = input?.titleKey || createTitleKey(title, year, type);

  const existing =
    (input?.id && state.items.get(input.id)) ||
    findTitleByKey(titleKey) ||
    null;

  const id = input?.id || existing?.id || `${titleKey}-${crypto.randomUUID().slice(0, 8)}`;

  const mergedCore = {
    title,
    originalTitle: input?.core?.originalTitle ?? input?.originalTitle ?? existing?.core?.originalTitle ?? title,
    type,
    year,
    status: input?.core?.status ?? input?.status ?? existing?.core?.status ?? "watchlist",
    lists: input?.core?.lists ?? existing?.core?.lists ?? [],
    rating: input?.core?.rating ?? input?.rating ?? existing?.core?.rating ?? null,
    notes: input?.core?.notes ?? existing?.core?.notes ?? "",
    createdAt: existing?.core?.createdAt || input?.core?.createdAt || now,
    updatedAt: now
  };

  const normalizedItem = {
    id,
    titleKey,
    core: mergedCore,
    meta: input?.meta ?? existing?.meta ?? null,
    availabilityDE: input?.availabilityDE ?? existing?.availabilityDE ?? null
  };

  state.items.set(id, normalizedItem);
  persistLocal();

  if (state.adapters.saveItem) {
    await state.adapters.saveItem(normalizedItem);
  }

  return normalizedItem;
}

export async function removeTitle(id) {
  if (!state.items.has(id)) return false;
  state.items.delete(id);
  persistLocal();

  if (state.adapters.deleteItem) {
    await state.adapters.deleteItem(id);
  }

  return true;
}

export async function enrichTitleIfNeeded(
  itemOrId,
  enrichFn,
  apiKey,
  {
    metaTtlDays = DEFAULT_META_TTL_DAYS,
    providersTtlDays = DEFAULT_PROVIDERS_TTL_DAYS,
    force = false
  } = {}
) {
  const current = typeof itemOrId === "string" ? getTitleById(itemOrId) : itemOrId;
  if (!current) return null;

  const needMeta = force || isCacheExpired(current.meta?.fetchedAt, metaTtlDays);
  const needProviders = force || isCacheExpired(current.availabilityDE?.fetchedAt, providersTtlDays);

  if (!needMeta && !needProviders) {
    return current;
  }

  const fetched = await enrichFn(current, apiKey);

  const updated = {
    ...current,
    meta: needMeta ? fetched.meta : current.meta,
    availabilityDE: needProviders ? fetched.availabilityDE : current.availabilityDE,
    core: {
      ...current.core,
      updatedAt: new Date().toISOString()
    }
  };

  state.items.set(updated.id, updated);
  persistLocal();

  if (state.adapters.saveItem) {
    await state.adapters.saveItem(updated);
  }

  return updated;
}
