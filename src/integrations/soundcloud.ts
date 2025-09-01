import { config } from "@waft/lib";
import { SoundCloudAuth } from "@waft/models";
import type { UploadTrackParams } from "@waft/types";
import { openFile } from "@waft/utils/io";
import signale from "signale";
import { SoundCloudError, SoundCloudErrorType } from "../errors";

const AUTH_BASE = "https://secure.soundcloud.com/authorize";
const TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
const API_BASE = "https://api.soundcloud.com";

type TokenState = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: Date | null;
};

class SoundCloudClient {
  private readonly clientId = config.scClientId;
  private readonly clientSecret = config.scClientSecret;
  private readonly redirectUri = config.scRedirectUri;
  private state: TokenState = {
    accessToken: null,
    refreshToken: null,
    tokenType: "OAuth",
    expiresAt: null,
  };

  async hydrate() {
    const doc = await SoundCloudAuth.findById("soundcloud").lean();

    if (!doc) {
      return false;
    }
    this.state.accessToken = doc.accessToken ?? null;
    this.state.refreshToken = doc.refreshToken ?? null;
    this.state.tokenType = doc.tokenType ?? "OAuth";
    this.state.expiresAt = doc.expiresAt ?? null;
    return true;
  }

  buildAuthUrl(stateParam?: string) {
    const url = new URL(AUTH_BASE);

    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri);
    if (stateParam) {
      url.searchParams.set("state", stateParam);
    }
    return url.toString();
  }

  async exchangeCode(code: string) {
    const body = new URLSearchParams();

    body.set("client_id", this.clientId);
    body.set("client_secret", this.clientSecret);
    body.set("redirect_uri", this.redirectUri);
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

    signale.log({ json });

    let me: any = null;
    try {
      const r = await fetch(`${API_BASE}/me`, {
        headers: {
          Authorization: `${json.token_type ?? "OAuth"} ${json.access_token}`,
        },
      });
      if (r.ok) me = await r.json();
    } catch {}

    await this.saveTokens({
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      tokenType: json.token_type ?? "OAuth",
      scope: json.scope ?? null,
      expiresInSec: json.expires_in ?? null,
      accountSnapshot: me
        ? {
            id: me.id,
            username: me.username,
            permalink: me.permalink_url ?? me.permalink,
            avatar_url: me.avatar_url,
          }
        : undefined,
    });

    await this.hydrate();
    return json;
  }

  private async refreshAccessToken() {
    if (!this.state.refreshToken) {
      throw new Error("No refresh token available");
    }

    const body = new URLSearchParams();

    body.set("client_id", this.clientId);
    body.set("client_secret", this.clientSecret);
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", this.state.refreshToken);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
    };

    await this.saveTokens({
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? this.state.refreshToken,
      tokenType: json.token_type ?? this.state.tokenType,
      expiresInSec: json.expires_in ?? null,
    });
    await this.hydrate();
  }

  private async authedFetch(path: string, init?: RequestInit) {
    if (!this.state.accessToken) {
      throw new SoundCloudError(
        "Not authenticated. Use /sc connect first.",
        SoundCloudErrorType.NotConnected
      );
    }

    const doFetch = () =>
      fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `${this.state.tokenType} ${this.state.accessToken}`,
        },
      });

    let res = await doFetch();

    if (res.status === 401 || res.status === 403) {
      if (this.state.refreshToken) {
        signale.log("found refresh so we refresh");
        await this.refreshAccessToken().catch(() => {});
        res = await doFetch();
      }
    }
    if (!res.ok) {
      const msg = await res.text();

      if (res.status === 401 || res.status === 403) {
        throw new SoundCloudError(
          "SoundCloud auth expired or revoked. Run `/sc connect` again.",
          SoundCloudErrorType.NotConnected
        );
      }
      throw new SoundCloudError(`SoundCloud API error ${res.status}: ${msg}`);
    }
    return res;
  }

  async getMe() {
    const res = await this.authedFetch("/me");
    return res.json() as any;
  }

  async saveTokens(params: any) {
    const expiresAt = params.expiresInSec
      ? new Date(Date.now() + params.expiresInSec * 1000)
      : null;
    const doc = await SoundCloudAuth.findByIdAndUpdate(
      "soundcloud",
      {
        $set: {
          accessToken: params.accessToken,
          refreshToken: params.refreshToken ?? null,
          tokenType: params.tokenType ?? "OAuth",
          scope: params.scope ?? null,
          expiresAt,
          account: params.accountSnapshot ?? {},
        },
      },
      { upsert: true, new: true }
    ).lean();

    return doc;
  }

  private async authedMultipart(
    path: string,
    form: FormData,
    method: "POST" | "PUT" = "POST"
  ) {
    if (!this.state.accessToken) {
      throw new SoundCloudError(
        "Not authenticated. Use /sc connect first.",
        SoundCloudErrorType.NotConnected
      );
    }

    const doFetch = () => {
      return fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `${this.state.tokenType} ${this.state.accessToken}`,
        },
        body: form,
      });
    };

    let res = await doFetch();

    if (res.status === 401 || res.status === 403) {
      if (this.state.refreshToken) {
        await this.refreshAccessToken().catch(() => {});
        res = await doFetch();
      }
    }
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new SoundCloudError(
          "SoundCloud auth expired or revoked. Run `/sc connect` again.",
          SoundCloudErrorType.AuthExpired
        );
      }
      throw new SoundCloudError(
        `SoundCloud API error ${res.status}: ${text}`,
        SoundCloudErrorType.APIError
      );
    }
    return res;
  }

  /**
   * Upload d’un track.
   * @param params
   *  - filePath: chemin local du fichier audio
   *  - title: titre du morceau
   *  - sharing: "public" | "private" (défaut "private" conseillé)
   *  - downloadable/streamable: flags
   *  - genre/tagList/description: métadonnées
   *  - releaseDate: Date optionnelle
   *  - artworkPath: image pour la cover (jpg/png)
   */
  async uploadTrack(params: UploadTrackParams) {
    const form = new FormData();
    const file = await openFile(params.filepath);

    form.append("track[title]", params.title);
    form.append("track[asset_data]", file);
    form.append("track[sharing]", "private"); // TODO: change this in the future
    form.append("track[downloadable]", String(params.downloadable ?? true));
    form.append("track[streamable]", String(params.streamable ?? true));

    if (params.genre) {
      form.append("track[genre]", params.genre);
    }

    if (params.tagList) {
      // TODO: add default tags
      const tags = Array.isArray(params.tagList)
        ? params.tagList.join(" ")
        : params.tagList;
      form.append("track[tag_list]", tags);
    }

    if (params.description) {
      form.append("track[description]", params.description);
    }

    if (params.releaseDate) {
      // format ISO ou "YYYY-MM-DD"
      form.append("track[release_date]", params.releaseDate.toISOString());
    }

    // if (params.artworkPath) {
    //   const artworkFile = Bun.file(params.artworkPath);

    //   if (artworkFile && (await artworkFile.exists()) === true) {
    //     form.append("track[artwork_data]", artworkFile);
    //   }
    // }

    const res = await this.authedMultipart("/tracks", form, "POST");

    return res.json();
  }
}

export const soundcloud = new SoundCloudClient();
