const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, { method = "GET", body, auth = true, form = false } = {}) {
  const headers = {};
  if (!form) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (email, username, password) =>
    request("/auth/register", { method: "POST", body: { email, username, password }, auth: false }),

  login: (username, password) => {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    return request("/auth/login", { method: "POST", body: form, auth: false, form: true });
  },

  submitScore: (points, level_reached) =>
    request("/scores", { method: "POST", body: { points, level_reached } }),

  leaderboard: (limit = 10) => request(`/scores/leaderboard?limit=${limit}`),

  myScores: (limit = 10, offset = 0) => request(`/scores/me?limit=${limit}&offset=${offset}`),
};
