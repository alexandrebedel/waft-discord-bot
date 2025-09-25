export type UploadTrackParams = {
  filepath: string;
  title: string;
  sharing?: "public" | "private";
  downloadable?: boolean;
  streamable?: boolean;
  genre?: string;
  tagList?: string | string[];
  description?: string;
  releaseDate?: Date;
  artworkPath?: string;
};

export type SaveTokensParams = {
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresInSec?: number | null;
  accountSnapshot?: {
    id?: number;
    username?: string;
    permalink?: string;
    avatar_url?: string;
  };
};

export type CreatePlaylistParams = {
  title: string;
  trackIds?: number[];
  sharing?: "public" | "private";
  description?: string;
  tagList?: string | string[];
};
