import { soundcloud } from "@waft/integrations";
import { config } from "@waft/lib";
import signale from "signale";

const DISCORD_REDIRECT = `https://discord.com/channels/${config.discordGuildId}/${config.discordReleaseChannelId}`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`SoundCloud error: ${error}`, { status: 400 });
  }
  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }
  try {
    const res = await soundcloud.exchangeCode(code);

    signale.success("[SoundCloud] tokens exchanged", res);
    return Response.redirect(DISCORD_REDIRECT, 302);
  } catch (e) {
    signale.error(e);
    // @ts-expect-error
    return new Response(`Token exchange failed: ${e?.message ?? e}`, {
      status: 500,
    });
  }
}
