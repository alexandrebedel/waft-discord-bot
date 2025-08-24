import { join } from "node:path";
import { FileSystemRouter, type RouterTypes } from "bun";
import signale from "signale";
import { HTTP_METHODS } from "../constants";

type HandlerModule = RouterTypes.RouteHandlerObject<string>;

const handlerCache = new Map<string, HandlerModule>();
export const router = new FileSystemRouter({
  dir: join(import.meta.dir, "/api"),
  style: "nextjs",
});

await Promise.all(
  Object.entries(router.routes).map(async ([routePath, filePath]) => {
    const entry: HandlerModule = {};
    const module = (await import(filePath)) as HandlerModule;

    for (const method of HTTP_METHODS) {
      const fn = module[method];
      if (typeof fn === "function") {
        entry[method] = fn;
      }
    }
    handlerCache.set(filePath, entry);
    return routePath;
  })
).then((paths) => {
  if (paths.length > 0) {
    signale.success(`Preloaded routes: ${paths.join(", ")}`);
    return;
  }
  signale.warn("No routes found to preload");
});

export { handlerCache };
