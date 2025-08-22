import type { RouterTypes } from "bun";
import { listFiles } from "../../lib/google";

export const GET: RouterTypes.RouteHandler<string> = async () => {
  return Response.json(await listFiles());
};
