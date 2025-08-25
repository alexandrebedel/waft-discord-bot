import { config } from "@waft/lib";
import { SoundcloudAuth } from "@waft/models";

const AUTH_BASE = "https://soundcloud.com/connect";
const TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
// const API_BASE = "https://api.soundcloud.com";

export function buildAuthUrl(state = "sc-oauth") {
  const u = new URL(AUTH_BASE);

  u.searchParams.set("client_id", config.scClientId);
  u.searchParams.set("redirect_uri", config.scRedirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function tokenRequest(params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`SC token request failed: ${res.status}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  }>;
}

// export async function exchangeCodeForToken(code: string) {
//   return tokenRequest({
//     client_id: config.scClientId,
//     client_secret: config.scClientSecret,
//     redirect_uri: config.scRedirectUri,
//     grant_type: "authorization_code",
//     code,
//   });
// }

// export async function refreshAccessToken(refreshToken: string) {
//   return tokenRequest({
//     client_id: config.scClientId,
//     client_secret: config.scClientSecret,
//     grant_type: "refresh_token",
//     refresh_token: refreshToken,
//   });
// }

// export async function ensureAccessToken(): Promise<string> {
//   const doc = await SoundcloudAuth.findOne({ _singleton: "soundcloud" });
//   if (!doc) throw new Error("SoundCloud is not connected.");

//   // refresh 60s before expiry
//   if (doc.expiresAt.getTime() - Date.now() < 60_000) {
//     const r = await refreshAccessToken(doc.refreshToken);
//     doc.accessToken = r.access_token;
//     if (r.refresh_token) doc.refreshToken = r.refresh_token;
//     doc.tokenType = r.token_type ?? "Bearer";
//     doc.expiresAt = new Date(Date.now() + r.expires_in * 1000);
//     if (r.scope) doc.scope = r.scope;
//     await doc.save();
//   }
//   return `${doc.tokenType} ${doc.accessToken}`;
// }
