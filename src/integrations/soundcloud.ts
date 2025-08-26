import { config } from "@waft/lib";
import signale from "signale";

const AUTH_BASE = "https://soundcloud.com/connect";
const TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
const API_BASE = "https://api.soundcloud.com";

type TokenState = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: "OAuth" | string; // SC uses "OAuth"
};

const state: TokenState = {
  accessToken: null,
  refreshToken: null,
  tokenType: "OAuth",
};

// --- getters/setters (useful for persistence) ---
export function getTokens() {
  return { ...state };
}
export function setTokens(
  access: string,
  refresh?: string | null,
  tokenType = "OAuth"
) {
  state.accessToken = access;
  state.refreshToken = refresh ?? state.refreshToken;
  state.tokenType = tokenType;
}
export function isConnected() {
  return !!state.accessToken;
}

// --- oauth helpers ---
export function buildAuthUrl(stateParam?: string) {
  const url = new URL(AUTH_BASE);
  url.searchParams.set("client_id", config.scClientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.scRedirectUri);
  // Optional: url.searchParams.set("scope", "non-expiring");
  if (stateParam) url.searchParams.set("state", stateParam);
  signale.log(url.toString());
  return url.toString();
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams();
  body.set("client_id", config.scClientId);
  body.set("client_secret", config.scClientSecret);
  body.set("redirect_uri", config.scRedirectUri);
  body.set("grant_type", "authorization_code");
  body.set("code", code);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok)
    throw new Error(
      `Token exchange failed (${res.status}): ${await res.text()}`
    );

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };

  setTokens(
    json.access_token,
    json.refresh_token ?? null,
    json.token_type ?? "OAuth"
  );
  return json;
}

export async function refreshAccessToken() {
  if (!state.refreshToken) throw new Error("No refresh token available");

  const body = new URLSearchParams();
  body.set("client_id", config.scClientId);
  body.set("client_secret", config.scClientSecret);
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", state.refreshToken);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok)
    throw new Error(`Refresh failed: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
  };

  setTokens(
    json.access_token,
    json.refresh_token ?? state.refreshToken,
    json.token_type ?? state.tokenType
  );
  return json;
}

export async function getMe() {
  if (!state.accessToken)
    throw new Error("Not authenticated. Use /sc connect first.");
  const res = await fetch(`${API_BASE}/me`, {
    headers: { Authorization: `${state.tokenType} ${state.accessToken}` },
  });
  if (!res.ok)
    throw new Error(`SoundCloud /me failed: ${res.status} ${res.statusText}`);
  return res.json();
}
