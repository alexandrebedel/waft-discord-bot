import { SoundCloudError, SoundCloudErrorType } from "../../errors";

export type TokenProvider = {
  getAccessToken(): string | null;
  getTokenType(): string;
  getRefreshToken(): string | null;
  refreshAccessToken(): Promise<void>;
};

export class SoundCloudHttp {
  constructor(
    private readonly apiBase: string,
    private readonly tokens: TokenProvider
  ) {}

  public async authedFetch(path: string, init?: RequestInit) {
    const access = this.tokens.getAccessToken();

    if (!access) {
      throw new SoundCloudError(
        "Not authenticated. Use /sc connect first.",
        SoundCloudErrorType.NotConnected
      );
    }

    const doFetch = (): Promise<Response> => {
      return fetch(`${this.apiBase}${path}`, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `${this.tokens.getTokenType()} ${access}`,
        },
      });
    };

    let res = await doFetch();

    if (res.status === 401 || res.status === 403) {
      if (this.tokens.getRefreshToken()) {
        await this.tokens.refreshAccessToken().catch(() => {});
        res = await doFetch();
      }
    }

    if (!res.ok) {
      const msg = await res.text();

      if (res.status === 401 || res.status === 403) {
        throw new SoundCloudError(
          "SoundCloud auth expired or revoked. Run `/sc connect` again.",
          SoundCloudErrorType.AuthExpired
        );
      }
      throw new SoundCloudError(
        `SoundCloud API error ${res.status}: ${msg}`,
        SoundCloudErrorType.APIError
      );
    }

    return res;
  }

  public async authedMultipart(
    path: string,
    form: FormData,
    method: "POST" | "PUT" = "POST"
  ): Promise<Response> {
    const access = this.tokens.getAccessToken();

    if (!access) {
      throw new SoundCloudError(
        "Not authenticated. Use /sc connect first.",
        SoundCloudErrorType.NotConnected
      );
    }

    const doFetch = (): Promise<Response> => {
      return fetch(`${this.apiBase}${path}`, {
        method,
        headers: {
          Authorization: `${this.tokens.getTokenType()} ${access}`,
        },
        body: form,
      });
    };

    let res = await doFetch();

    if (res.status === 401 || res.status === 403) {
      if (this.tokens.getRefreshToken()) {
        await this.tokens.refreshAccessToken().catch(() => {});
        res = await doFetch();
      }
    }

    if (!res.ok) {
      const msg = await res.text();

      if (res.status === 401 || res.status === 403) {
        throw new SoundCloudError(
          "SoundCloud auth expired or revoked. Run `/sc connect` again.",
          SoundCloudErrorType.AuthExpired
        );
      }
      throw new SoundCloudError(
        `SoundCloud API error ${res.status}: ${msg}`,
        SoundCloudErrorType.APIError
      );
    }
    return res;
  }
}
