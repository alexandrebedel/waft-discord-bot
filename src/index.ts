import "./commands";
import { soundcloud } from "@waft/integrations";
import type { RouterTypes } from "bun";
import signale from "signale";
import { config, discordClient } from "./lib";
import { dbCleanup, dbConnect } from "./lib/db";
import { handlerCache, router } from "./server";

discordClient.once("clientReady", (client) => {
  signale.success(`Successfully connected as ${client.user?.tag}`);
});

discordClient.login(config.discordToken);

await dbConnect();
await soundcloud.hydrate();
// await gdrive.initWatch();
// await gdrive.startWatch(`${config.appUrl}google/changes`);

// TODO: integrate middleware chain
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  async fetch(req) {
    const match = router.match(req);

    if (!match) {
      return new Response("Not Found", { status: 404 });
    }

    const method = req.method.toUpperCase() as RouterTypes.HTTPMethod;
    const handlers = handlerCache.get(match.filePath);
    const handler =
      handlers?.[method] ?? (method === "HEAD" ? handlers?.GET : undefined);

    if (!handler) {
      return new Response("Method Not Allowed", { status: 405 });
    }
    try {
      // @ts-expect-error
      return await handler(req, {
        params: match.params as Record<string, string>,
      });
    } catch (e) {
      signale.error(e);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

process.on("SIGINT", async () => {
  await dbCleanup();
  // await gdrive.stopWatch();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await dbCleanup();
  // await gdrive.stopWatch();
  process.exit(0);
});
process.on("exit", async () => {
  // await gdrive.stopWatch();
  await dbCleanup();
});
