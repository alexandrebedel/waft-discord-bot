import type { RouterTypes } from "bun";

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] satisfies RouterTypes.HTTPMethod[];
