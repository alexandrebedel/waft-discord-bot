import type { BunRoutes } from "../constants";

export interface IWAFTRoute<TRoute extends string> extends BunRoutes<TRoute> {
  readonly path: TRoute;
}
