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
