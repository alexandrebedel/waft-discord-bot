import type { RouterTypes } from "bun";

export type ReleaseType = (typeof RELEASE_TYPES)[number]["value"];
export type LineType = (typeof LINE_TYPES)[number];
export type SoundCloudPlaylistType = (typeof SC_PLAYLIST_TYPES)[number];

export const SHORT_WEEKDAYS = [
  "dim.",
  "lun.",
  "mar.",
  "mer.",
  "jeu.",
  "ven.",
  "sam.",
] as const;
export const SHORT_MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] satisfies RouterTypes.HTTPMethod[];

export const RELEASE_TYPES = [
  { name: "EP", value: "EP" },
  { name: "Album (LP)", value: "LP" },
  { name: "Free Download (FDL)", value: "FDL" },
  { name: "Compilation (COMP)", value: "COMP" },
] as const;

export const LINE_TYPES = ["mainline", "subline"] as const;

export const SC_PLAYLIST_TYPES = [
  "PLAYLIST",
  "ALBUM",
  "EP",
  "COMPILATION",
  "SINGLE",
] as const;
