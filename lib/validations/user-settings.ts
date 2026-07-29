import { z } from "zod";
import { Theme, Locale } from "@/app/generated/prisma/enums";

// Validated against the runtime's actual IANA database rather than a
// hand-maintained list, per 05-nextjs-conventions.md "Timezone handling"
// — the <select> in the settings form is built from the same source
// (Intl.supportedValuesOf("timeZone")), so this can never reject a value
// the UI itself offered.
const validTimeZones = new Set(Intl.supportedValuesOf("timeZone"));

export const updateUserSettingsSchema = z.object({
  timezone: z.string().refine((tz) => validTimeZones.has(tz), {
    message: "Invalid IANA timezone",
  }),
  theme: z.enum(Theme),
  locale: z.enum(Locale),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
