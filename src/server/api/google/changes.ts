import { channelExpiresInMs, startWatch, syncChanges } from "@waft/integrations/google";
import type { BunRoutes } from "@waft/types";
import signale from "signale";

export const POST: BunRoutes<string>["POST"] = async (req) => {
  const h = Object.fromEntries(req.headers.entries());
  signale.info("[DriveWebhook] notif", {
    channel: h["x-goog-channel-id"],
    resource: h["x-goog-resource-id"],
    state: h["x-goog-resource-state"], // "exists", "sync", "not_exists"
    msg: h["x-goog-message-number"],
  });

  try {
    // 1) sync les changements
    const { changes } = await syncChanges();

    // console.log(changes);

    // 2) À toi de jouer : parcours des changements
    for (const ch of changes) {
      const f = ch.file;
      if (!f) continue;
      // Exemple: log lisible
      signale.note(
        `• ${f.name} [${f.mimeType}] id=${f.id} parents=${
          f.parents?.join(",") ?? "-"
        }`
      );
      // ici tu branches ta logique (DB / Discord)
    }

    // // 3) optionnel: si le channel expire dans < 5min, relance un watch
    // const left = channelExpiresInMs();
    // if (left !== null && left < 5 * 60_000) {
    //   await startWatch(`https://56d847b3ddf7.ngrok-free.app/api/google/changes`);
    //   signale.info("[Drive] watch renewed before expiration");
    // }

    return new Response("OK");
  } catch (e) {
    signale.error("[DriveWebhook] sync failed", e);
    return new Response("ERR", { status: 500 });
  }
};
