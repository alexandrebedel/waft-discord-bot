import { parseReleaseDate } from "@waft/utils/planning";
import z from "zod";

export const trackAddZ = z
  .object({
    catalog: z.string().min(1).trim(),
    status: z.enum(["premaster", "master"]).default("premaster"),
    index: z
      .preprocess(
        (v) => (typeof v === "string" ? v.trim() : v),
        z.string().min(1).regex(/^\d+$/, "index doit être un entier")
      )
      .transform((s) => Number(s))
      .refine((n) => Number.isInteger(n) && n >= 1, {
        message: "`index` doit être un entier ≥ 1",
      }),
    artist: z.string().trim().min(1, "`artist` est requis"),
    title: z.string().trim().min(1, "`title` est requis"),
    releaseDateStr: z
      .string()
      .optional()
      .transform((s) => s?.trim() || ""),
    driveUrl: z
      .string()
      .optional()
      .transform((s) => s?.trim() || ""),
  })
  .transform((v) => {
    const date = v.releaseDateStr ? parseReleaseDate(v.releaseDateStr) : null;

    if (v.releaseDateStr && !date) {
      throw new z.ZodError([
        {
          path: ["release_date"],
          message:
            "Format de date invalide. Utilise `YYYY-MM-DD` ou `DD/MM/YYYY`.",
          code: "custom",
        },
      ]);
    }
    return { ...v, releaseDate: date ?? undefined };
  });
