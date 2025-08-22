import { z } from "zod";

export type CreateReleaseZod = z.infer<typeof createReleaseZ>;
export type ReleaseInput = z.infer<typeof releaseZ>;

/** Accepted catalog formats :
 *  - Mainline : WAFT-001
 *  - Series   : WAFT-FDL004, WAFT-COMP001, ...
 */
const RE_MAIN = /^WAFT-\d{3}$/;
const RE_SERIES = /^WAFT-[A-Z]{2,6}\d{3}$/;

export const seriesZ = z.enum(["FDL", "COMP"]).nullable().default(null);

export const releaseZ = z.object({
  catalog: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine((v) => RE_MAIN.test(v) || RE_SERIES.test(v), {
      message:
        "Invalid catalog. Use `WAFT-001` or `WAFT-AAA001` (e.g., `WAFT-FDL004`).",
    }),
  series: seriesZ, // null = mainline
  type: z.enum(["COMP", "FDL", "EP", "ALBUM"]),
  title: z.string().trim().optional(),
  releaseDate: z.coerce.date().optional(),
  channelId: z.string(),
  planningMessageId: z.string().optional(),
  threadId: z.string().optional(),
});

export const createReleaseZ = releaseZ.pick({
  catalog: true,
  series: true,
  type: true,
  title: true,
  releaseDate: true,
  channelId: true,
});
