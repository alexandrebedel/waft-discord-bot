import { FileSystemRouter, type RouterTypes } from "bun";
import { join } from "node:path";
import { HTTP_METHODS } from "../constants";

type HandlerModule = Partial<
  Record<RouterTypes.HTTPMethod, RouterTypes.RouteHandler<string>>
>;

export const router = new FileSystemRouter({
  dir: join(import.meta.dir, "/api"),
  style: "nextjs",
});

const handlerCache = new Map<string, HandlerModule>();

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
).then((v) => console.log(`Preloaded routes: ${v.join(", ")}`));

export { handlerCache };
