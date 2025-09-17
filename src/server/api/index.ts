import type { RouterTypes } from "bun";

export const GET: RouterTypes.RouteHandler<string> = async () => {
  return Response.json({ ok: true });
};
