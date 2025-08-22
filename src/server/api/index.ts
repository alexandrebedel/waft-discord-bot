import type { RouterTypes } from "bun";
import { GoogleService } from "../../lib/google";

export const GET: RouterTypes.RouteHandler<string> = async () => {
  return Response.json(await GoogleService.listFiles());
};
