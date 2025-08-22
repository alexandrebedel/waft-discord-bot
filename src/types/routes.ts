import type { RouterTypes } from "bun";

export type BunRoutes<T extends string> = RouterTypes.RouteHandlerObject<T>;
