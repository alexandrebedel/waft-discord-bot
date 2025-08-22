import type { RouterTypes } from "bun";

export type BunRoutes<T extends string> = RouterTypes.RouteHandlerObject<T>;

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
] satisfies RouterTypes.HTTPMethod[];
