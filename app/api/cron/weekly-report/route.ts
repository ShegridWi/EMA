import { NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getWeekRange, getReportData, generateReportPdf } from "@/lib/reports";
import { sendEmail } from "@/lib/email";
import { DEFAULT_TIMEZONE } from "@/lib/user-settings";
import { formatInTimezone } from "@/lib/timezone";

// Hit by an external scheduler, never by a signed-in user — there is no
// `auth()`/session check here on purpose. `CRON_SECRET` (.env) is the
// ONLY thing protecting this endpoint (.prompts/08-reports.md). Next.js
// App Platform has no built-in per-app cron for a web service
// (05-nextjs-conventions.md "Weekly report scheduling"), so this route
// itself doesn't schedule anything — it's meant to be wired up with
// either:
//   - A DigitalOcean App Platform "Job" component with a cron schedule
//     hitting this URL, or
//   - A free/low-cost external pinger (e.g. cron-job.org) configured to
//     call `GET /api/cron/weekly-report?secret=$CRON_SECRET` every
//     Saturday.
// Accepts the secret as either a `secret` query param or an
// `Authorization: Bearer <secret>` header, whichever the chosen
// scheduler supports.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = request.nextUrl.searchParams.get("locale") ?? "es";
  // This email broadcasts to every active admin (below), who could each
  // have a different configured timezone — there's no single "viewer"
  // to personalize for, so it uses the business default rather than
  // sending N differently-formatted emails.
  const timeZone = DEFAULT_TIMEZONE;
  const range = getWeekRange();
  const data = await getReportData(range);
  const pdfBuffer = await generateReportPdf(data, locale, timeZone);

  // Resolved assumption #7 (04-scope-mvp.md): every active admin, queried
  // dynamically — not a fixed mailbox — so it stays correct as admins
  // are added/deactivated.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, deletedAt: null },
    select: { email: true },
  });

  if (admins.length === 0) {
    return NextResponse.json({ warning: "No active admins to send to" });
  }

  const t = await getTranslations({ locale, namespace: "Reports" });
  const from = formatInTimezone(range.from, timeZone, locale, { dateStyle: "medium" });
  const to = formatInTimezone(range.to, timeZone, locale, { dateStyle: "medium" });

  await sendEmail({
    to: admins.map((admin) => admin.email),
    subject: t("weeklyEmailSubject", { from, to }),
    text: t("weeklyEmailBody", { from, to }),
    attachments: [
      {
        filename: `reporte-semanal-${range.from.toISOString().slice(0, 10)}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  return NextResponse.json({ success: true, sentTo: admins.length });
}
