import { config } from "@waft/lib";
import { SoundCloudAuth } from "@waft/models";
import type {
  CreatePlaylistParams,
  SaveTokensParams,
  UploadTrackParams,
} from "@waft/types";
import { openFile } from "@waft/utils/io";
import signale from "signale";
import { SoundCloudError, SoundCloudErrorType } from "../../errors";
import { SoundCloudHttp } from "./http";

const AUTH_BASE = "https://secure.soundcloud.com/authorize";
const TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
const API_BASE = "https://api.soundcloud.com";

type TokenState = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: Date | null;
};

class SoundCloudClient extends SoundCloudHttp {
  private readonly clientId = config.scClientId;
  private readonly clientSecret = config.scClientSecret;
  private readonly redirectUri = config.scRedirectUri;
  private state: TokenState = {
    accessToken: null,
    refreshToken: null,
    tokenType: "OAuth",
    expiresAt: null,
  };

  constructor() {
    super(API_BASE, {
      getAccessToken: () => this.state.accessToken,
      getTokenType: () => this.state.tokenType,
      getRefreshToken: () => this.state.refreshToken,
      refreshAccessToken: () => this.refreshAccessToken(),
    });
  }

  public async refreshAccessToken() {
    if (!this.state.refreshToken) {
      throw new SoundCloudError(
        "No refresh token available",
        SoundCloudErrorType.RefreshFailed
      );
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
      throw new SoundCloudError(
        `Refresh failed: ${res.status} ${res.statusText}`,
        SoundCloudErrorType.RefreshFailed
      );
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

  public async hydrate() {
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

  public buildAuthUrl(stateParam?: string) {
    const url = new URL(AUTH_BASE);

    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", this.redirectUri);
    if (stateParam) {
      url.searchParams.set("state", stateParam);
    }
    return url.toString();
  }

  public async exchangeCode(code: string) {
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

    if (!res.ok) {
      throw new SoundCloudError(
        `Token exchange failed (${res.status}): ${await res.text()}`,
        SoundCloudErrorType.TokenExchangeFailed
      );
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      scope?: string;
    };

    let me: any;
    try {
      const r = await fetch(`${API_BASE}/me`, {
        headers: {
          Authorization: `${json.token_type ?? "OAuth"} ${json.access_token}`,
        },
      });
      if (r.ok) {
        me = await r.json();
      }
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

  public async getMe<T extends Record<string, unknown>>() {
    const res = await super.authedFetch("/me");

    return res.json() as Promise<T>;
  }

  public async uploadTrack(params: UploadTrackParams) {
    const form = new FormData();
    const file = await openFile(params.filepath);

    form.append("track[title]", params.title);
    form.append("track[asset_data]", file);
    form.append("track[sharing]", "private");
    form.append("track[downloadable]", String(params.downloadable ?? true));
    form.append("track[streamable]", String(params.streamable ?? true));

    if (params.genre) {
      form.append("track[genre]", params.genre);
    }
    if (params.tagList) {
      const tags = Array.isArray(params.tagList)
        ? params.tagList.join(" ")
        : params.tagList;
      form.append("track[tag_list]", tags);
    }
    if (params.description) {
      form.append("track[description]", params.description);
    }
    if (params.releaseDate) {
      form.append("track[release_date]", params.releaseDate.toISOString());
    }

    const res = await super.authedMultipart("/tracks", form, "POST");

    return res.json();
  }

  public async createPlaylist(params: CreatePlaylistParams) {
    const form = new FormData();

    form.append("playlist[title]", params.title);
    form.append("playlist[sharing]", "private");
    form.append("playlist_type", "ep");
    if (params.description) {
      form.append("playlist[description]", params.description);
    }
    if (params.tagList) {
      const tags = Array.isArray(params.tagList)
        ? params.tagList.join(" ")
        : params.tagList;
      form.append("playlist[tag_list]", tags);
    }
    if (params.trackIds?.length) {
      params.trackIds.forEach((id, i) => {
        form.append(`playlist[tracks][${i}][id]`, String(id));
      });
    }

    const res = await super.authedMultipart("/playlists", form, "POST");
    const data = await res.json();

    signale.log({ data });
    return data;
  }

  private async saveTokens(params: SaveTokensParams) {
    const expiresAt = params.expiresInSec
      ? new Date(Date.now() + params.expiresInSec * 1000)
      : null;

    await SoundCloudAuth.findByIdAndUpdate(
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
  }
}

export const soundcloud = new SoundCloudClient();
