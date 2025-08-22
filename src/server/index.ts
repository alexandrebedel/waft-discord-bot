import { HTTP_METHODS } from "../constants";
import type { IWAFTRoute } from "../types/routes";
import * as routes from "./routes";

export function buildRoutesFromModule() {
  const localRoutes: Record<string, any> = {};

  for (const [_, route] of Object.entries(routes)) {
    const instance: IWAFTRoute<string> = new (route as any)();

    if (!instance?.path || typeof instance.path !== "string") {
      continue;
    }

    const path = instance.path;

    localRoutes[path] ||= {};
    for (const m of HTTP_METHODS) {
      const fn = instance[m];

      if (typeof fn === "function") {
        localRoutes[path][m] = fn.bind(instance);
      }
    }
  }
  return localRoutes;
}
