import { LINE_TYPES, RELEASE_TYPES } from "@waft/constants";
import { parseReleaseDate } from "@waft/utils/planning";
import { z } from "zod";
import { releaseDateRefiner } from "./refiners";

export type CreateReleaseZod = z.infer<typeof createReleaseZ>;
export type ReleaseInput = z.infer<typeof releaseZ>;

/** Accepted catalog formats :
 *  - Mainline : WAFT001
 *  - Series   : WAFT-FDL004, WAFT-COMP001, ...
 */
const RE_MAIN = /^WAFT\d{3}$/;
const RE_SERIES = /^WAFT-[A-Z]{2,6}\d{3}$/;

export const releaseZ = z.object({
  catalog: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((v) => RE_MAIN.test(v) || RE_SERIES.test(v), {
      message:
        "Invalid catalog. Use `WAFT001` or `WAFT-AAA001` (e.g., `WAFT-FDL004`).",
    }),
  type: z.enum(RELEASE_TYPES.map((v) => v.value)),
  lineType: z.enum(LINE_TYPES),
  title: z.string().trim(),
  description: z.string().trim(),
  releaseDate: z.coerce.date().optional(),
  channelId: z.string(),
  planningMessageId: z.string().optional(),
  threadId: z.string().optional(),
  driveFolderId: z.string().optional(),
});

export const createReleaseZ = releaseZ.pick({
  catalog: true,
  type: true,
  description: true,
  title: true,
  lineType: true,
  releaseDate: true,
  channelId: true,
});
