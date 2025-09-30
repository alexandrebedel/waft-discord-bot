import { config } from "@waft/lib";
import { parseReleaseDate } from "@waft/utils/planning";
import z from "zod";

export const driveRefiner: Parameters<z.ZodString["refine"]> = [
  (u) => /^https?:\/\/(drive\.google\.com|docs\.google\.com)\//i.test(u),
  { message: "Lien Drive attendu" },
];

export const premiereCreateZ = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "`title` est requis")
      .transform((t) => `${config.scPremierePrefix} ${t}`),
    description: z.string().trim().min(1, "`description` est requis"),
    releaseDateStr: z.string().trim().min(1, "`release_date` est requis"),
    audioUrl: z
      .string()
      .trim()
      .min(1, "`audio_url` est requis")
      .refine(...driveRefiner),
    artworkUrl: z
      .string()
      .trim()
      .min(1, "`artwork_url` est requis")
      .refine(...driveRefiner),
  })
  .transform((v) => {
    const scheduledAt = parseReleaseDate(v.releaseDateStr, true);

    if (!scheduledAt) {
      throw new z.ZodError([
        {
          path: ["release_date"],
          message: "Format de date invalide. Utilise `DD/MM/YYYY HH:MM`.",
          code: "custom",
        },
      ]);
    }
    return { ...v, scheduledAt };
  });
