import type { RouterTypes } from "bun";

export type ReleaseType = (typeof RELEASE_TYPES)[number]["value"];
export type LineType = (typeof LINE_TYPES)[number];

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
