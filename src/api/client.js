const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const TOKEN_KEY = "bb_token";
const USER_KEY = "bb_user";

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors || {};
  }
}

export const AuthStore = {
  token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },
  set(authResponse) {
    localStorage.setItem(TOKEN_KEY, authResponse.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
  },
  updateUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() {
    return Boolean(this.token());
  }
};

function redirectToLogin() {
  const current = window.location.pathname + window.location.search;
  const next = encodeURIComponent(current.startsWith("/login") ? "/dashboard" : current);
  window.location.assign("/login?expired=1&next=" + next);
}

async function request(path, options = {}) {
  const method = options.method || "GET";
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const token = AuthStore.token();
  if (token) headers.Authorization = "Bearer " + token;

  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body
    });
  } catch {
    throw new ApiError(
      "Cannot reach the BorrowBuddy server. Check your connection and try again.",
      0
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let payload;
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const fieldErrors =
      payload && payload.data && payload.data.fieldErrors ? payload.data.fieldErrors : {};
    const message =
      (payload && payload.message) ||
      (response.status === 403 ? "You are not allowed to do that." : "Request failed.");
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      AuthStore.clear();
      redirectToLogin();
    }
    throw new ApiError(message, response.status, fieldErrors);
  }

  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

export const api = {
  base: API_BASE,
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, { method: "POST", body });
  },
  put(path, body) {
    return request(path, { method: "PUT", body });
  },
  del(path) {
    return request(path, { method: "DELETE" });
  },
  upload(file) {
    const form = new FormData();
    form.append("file", file);
    return request("/api/uploads", { method: "POST", body: form });
  },
  qs(params) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.append(key, value);
      }
    });
    const query = search.toString();
    return query ? "?" + query : "";
  }
};
