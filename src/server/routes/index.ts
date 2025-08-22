import type { IWAFTRoute } from "../../types/routes";

export class IndexRoute implements IWAFTRoute<"/api/"> {
  public readonly path = "/api/";

  public async GET() {
    return new Response("OK");
  }
}
