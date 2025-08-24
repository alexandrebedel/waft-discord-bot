import "./commands";
import type { RouterTypes } from "bun";
import signale from "signale";
import { config, discordClient } from "./lib";
import { dbCleanup, dbConnect } from "./lib/db";
import { handlerCache, router } from "./server";

discordClient.once("clientReady", (client) => {
  signale.success(`Successfully connected as ${client.user?.tag}`);
});

discordClient.login(config.discordToken);

// TODO: some kind of bot disable when the db is not connected
await dbConnect();

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

process.on("exit", () => dbCleanup());
