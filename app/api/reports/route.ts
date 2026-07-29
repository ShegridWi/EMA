import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReportData, generateReportPdf } from "@/lib/reports";
import { zonedTimeToUtc } from "@/lib/timezone";

// Manual report download — admin-only, direct PDF response (no email
// involved, unlike the weekly cron job). A plain GET so the reports page
// can trigger it with a normal <form method="GET">, no client JS needed;
// the browser handles the attachment download on its own.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const locale = searchParams.get("locale") ?? "es";

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "'from' and 'to' query params are required" },
      { status: 400 },
    );
  }

  // Date-only inputs interpreted as midnight in *this admin's*
  // configured timezone, not the server's local time
  // (05-nextjs-conventions.md "Timezone handling").
  const timeZone = session.user.settings.timezone;
  const from = zonedTimeToUtc(fromParam, timeZone);
  const to = zonedTimeToUtc(toParam, timeZone, {
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data = await getReportData({ from, to });
  const pdfBuffer = await generateReportPdf(data, locale, timeZone);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${fromParam}-a-${toParam}.pdf"`,
    },
  });
}
