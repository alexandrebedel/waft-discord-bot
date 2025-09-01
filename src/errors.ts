export enum SoundCloudErrorType {
  NotConnected = "NotConnected",
  AuthExpired = "AuthExpired",
  APIError = "APIError",
  TokenExchangeFailed = "TokenExchangeFailed",
  RefreshFailed = "RefreshFailed",
}

export class SoundCloudError extends Error {
  public readonly type: SoundCloudErrorType;

  constructor(
    message?: string,
    type: SoundCloudErrorType = SoundCloudErrorType.APIError
  ) {
    super(message ?? type);
    this.name = "SoundCloudError";
    this.type = type;
    Error.captureStackTrace?.(this, SoundCloudError);
  }

  is(type: SoundCloudErrorType) {
    return this.type === type;
  }
}
