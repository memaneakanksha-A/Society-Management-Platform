import { useEffect, useState } from "react";
import { getSettings } from "@/api/content.api";
import { useAuth } from "@/context/AuthContext";

export interface SocietySlugData {
  slug: string | null;
  name: string | null;
  logo: string | null;
  loading: boolean;
}

const EMPTY: SocietySlugData = { slug: null, name: null, logo: null, loading: false };
const LOADING: SocietySlugData = { slug: null, name: null, logo: null, loading: true };

// Module-level cache, keyed by the logged-in user id so switching users
// never shows the previous society's name, logo or slug.
let cachedUserId: string | null = null;
let cachedData: SocietySlugData | null = null;
let fetchPromise: Promise<SocietySlugData> | null = null;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((cb) => cb());
};

const fetchSocietyData = async (userId: string, force = false): Promise<SocietySlugData> => {
  if (!force && cachedUserId === userId && cachedData && !cachedData.loading) return cachedData;
  if (!force && fetchPromise && cachedUserId === userId) return fetchPromise;

  cachedUserId = userId;
  fetchPromise = (async () => {
    cachedData = LOADING;
    notifySubscribers();

    const attempt = async (): Promise<SocietySlugData> => {
      const settings = await getSettings();
      return {
        slug: settings.slug || null,
        name: settings.name || null,
        logo: settings.logo || null,
        loading: false,
      };
    };

    try {
      let result: SocietySlugData;
      try {
        result = await attempt();
      } catch {
        // retry once on failure
        result = await attempt();
      }
      cachedData = result;
      notifySubscribers();
      return result;
    } catch {
      const result: SocietySlugData = { ...EMPTY };
      cachedData = result;
      notifySubscribers();
      return result;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export interface SocietySlugResult extends SocietySlugData {
  error: boolean;
  retry: () => void;
}

export const useSocietySlug = (): SocietySlugResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<{ userId: string | null; data: SocietySlugData }>(() => ({
    userId,
    data: cachedUserId === userId && cachedData ? cachedData : LOADING,
  }));

  useEffect(() => {
    if (!userId) {
      cachedUserId = null;
      cachedData = EMPTY;
      setState({ userId: null, data: EMPTY });
      notifySubscribers();
      return;
    }

    const callback = () => {
      if (cachedUserId === userId && cachedData) {
        setState({ userId, data: cachedData });
      }
    };
    subscribers.add(callback);

    if (cachedUserId !== userId || !cachedData || cachedData.loading) {
      // Show empty (not the previous user's data) while the new user's society loads.
      const loadingState: SocietySlugData = LOADING;
      cachedUserId = userId;
      cachedData = loadingState;
      setState({ userId, data: loadingState });
      notifySubscribers();

      fetchSocietyData(userId).then((result) => {
        if (cachedUserId === userId) setState({ userId, data: result });
      });
    } else {
      setState({ userId, data: cachedData });
    }

    return () => {
      subscribers.delete(callback);
    };
  }, [userId]);

  // Guard the render before the effect runs after a user switch: never flash
  // the previous user's society.
  const data = state.userId === userId ? state.data : userId ? LOADING : EMPTY;
  const error = !!userId && !data.loading && !data.slug;
  const retry = () => {
    if (userId) fetchSocietyData(userId, true);
  };
  return { ...data, error, retry };
};

// Clear the cache (called on logout and available for manual refresh).
export const clearSocietySlugCache = () => {
  cachedUserId = null;
  cachedData = null;
  fetchPromise = null;
  notifySubscribers();
};

// Helper to manually refresh the current user's society data.
export const refreshSocietySlug = () => {
  clearSocietySlugCache();
};