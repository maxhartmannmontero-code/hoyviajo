import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // cellDates: true → date cells come as JS Date objects instead of serial numbers
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      raw: true,
    }) as unknown[][];

    // Normalize each cell: Date → "YYYY-MM-DD", everything else → string
    const rows = rawRows.map((row) =>
      (row as unknown[]).map((cell) => {
        if (cell instanceof Date) return cell.toISOString().slice(0, 10);
        return String(cell ?? "");
      })
    );

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("[POST /api/sales/parse-excel]", e);
    return NextResponse.json({ error: "Could not parse file" }, { status: 500 });
  }
}
