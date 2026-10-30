const API_BASE = import.meta.env.VITE_API_URL || "/api";

const ACCESS_KEY = "nebula.access";
const REFRESH_KEY = "nebula.refresh";
const USER_KEY = "nebula.user";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  getCachedUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save({ access, refresh, user }) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

function extractMessage(data) {
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(extractMessage).join(" ");
  if (typeof data === "object") {
    if (data.detail) return extractMessage(data.detail);
    if (data.non_field_errors) return extractMessage(data.non_field_errors);
    const first = Object.entries(data)[0];
    if (first) {
      const [field, value] = first;
      const pretty = field.replace(/_/g, " ");
      return `${pretty.charAt(0).toUpperCase()}${pretty.slice(1)}: ${extractMessage(value)}`;
    }
  }
  return "Something went wrong. Please try again.";
}

let refreshInFlight = null;

async function refreshAccess() {
  if (!refreshInFlight) {
    const refresh = tokenStore.getRefresh();
    if (!refresh) return Promise.reject(new Error("No refresh token"));
    refreshInFlight = fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Refresh failed");
        const data = await res.json();
        const current = tokenStore.getCachedUser();
        tokenStore.save({ access: data.access, refresh: data.refresh, user: current });
        return data.access;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function api(path, options = {}) {
  const { method = "GET", body, auth = true } = options;
  const headers = {};
  const access = tokenStore.getAccess();
  if (auth && access) headers.Authorization = `Bearer ${access}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && tokenStore.getRefresh() && !options.retried) {
    try {
      await refreshAccess();
      return api(path, { ...options, retried: true });
    } catch {
      tokenStore.clear();
      window.dispatchEvent(new Event("nebula:session-expired"));
      throw new ApiError("Your session expired. Please sign in again.", 401, null);
    }
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      window.dispatchEvent(new Event("nebula:session-expired"));
    }
    throw new ApiError(extractMessage(data), response.status, data);
  }

  return data;
}

export function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}
