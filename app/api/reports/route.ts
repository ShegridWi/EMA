import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReportData, generateReportPdf } from "@/lib/reports";

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

  const from = new Date(`${fromParam}T00:00:00`);
  const to = new Date(`${toParam}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const data = await getReportData({ from, to });
  const pdfBuffer = await generateReportPdf(data, locale);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${fromParam}-a-${toParam}.pdf"`,
    },
  });
}
