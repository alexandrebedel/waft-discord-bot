import type { RouterTypes } from "bun";
import { listFiles } from "../../integrations/google";

export const GET: RouterTypes.RouteHandler<string> = async () => {
  return Response.json(await listFiles());
};
