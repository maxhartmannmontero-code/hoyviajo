import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { updateSale } from "@/lib/google-sheets";
import { CommissionStatus } from "@/types";

const MIGRATIONS: Array<{ id: string; commissionStatus: CommissionStatus; reservationId: string }> = [
  // INV2388876 — cobradas ($1.103.000 pagado abr)
  { id: "990239343700", commissionStatus: "cobrada",   reservationId: "990239343700" },
  { id: "355997343700", commissionStatus: "cobrada",   reservationId: "355997343700" },
  { id: "48795344700",  commissionStatus: "cobrada",   reservationId: "48795344700"  },

  // Factura jun 17-18 — todo en un ciclo ($1.923.384, cobro 25 jun)
  // -- INV2418113 (May 4-17, $402.000)
  { id: "448632345000", commissionStatus: "facturada", reservationId: "448632345000" },
  { id: "563853345200", commissionStatus: "facturada", reservationId: "563853345200" },
  { id: "952958345300", commissionStatus: "facturada", reservationId: "952958345300" },
  { id: "915544345400", commissionStatus: "facturada", reservationId: "915544345400" },
  { id: "891716346100", commissionStatus: "facturada", reservationId: "891716346100" },
  // -- May 18-31 ($1.059.139)
  { id: "295106346400", commissionStatus: "facturada", reservationId: "295106346400" },
  { id: "24879346400",  commissionStatus: "facturada", reservationId: "24879346400"  },
  { id: "126491346400", commissionStatus: "facturada", reservationId: "126491346400" },
  { id: "456178346400", commissionStatus: "facturada", reservationId: "456178346400" },
  { id: "855156346600", commissionStatus: "facturada", reservationId: "855156346600" },
  { id: "336052346800", commissionStatus: "facturada", reservationId: "336052346800" },
  { id: "739384346800", commissionStatus: "facturada", reservationId: "739384346800" },
  { id: "719840347200", commissionStatus: "facturada", reservationId: "719840347200" },
  { id: "469854347200", commissionStatus: "facturada", reservationId: "469854347200" },
  { id: "391676347400", commissionStatus: "facturada", reservationId: "391676347400" },
  { id: "656863347400", commissionStatus: "facturada", reservationId: "656863347400" },
  // -- Jun 1-14 ($462.245)
  { id: "757722347800", commissionStatus: "facturada", reservationId: "757722347800" },
  { id: "335472348000", commissionStatus: "facturada", reservationId: "335472348000" },
  { id: "36718348300",  commissionStatus: "facturada", reservationId: "36718348300"  },
  { id: "298029348600", commissionStatus: "facturada", reservationId: "298029348600" },
  { id: "629662349100", commissionStatus: "facturada", reservationId: "629662349100" },

  // Viaclub — pendiente
  { id: "mpndm8eteyx9moh8f0a", commissionStatus: "pendiente", reservationId: "" },
];

export async function POST() {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const m of MIGRATIONS) {
      try {
        await updateSale(token, m.id, {
          commissionStatus: m.commissionStatus,
          reservationId: m.reservationId,
        });
        results.push({ id: m.id, status: "ok" });
      } catch (e) {
        results.push({ id: m.id, status: "error", error: String(e) });
      }
    }

    const ok    = results.filter(r => r.status === "ok").length;
    const error = results.filter(r => r.status === "error").length;
    return NextResponse.json({ ok, error, results });
  } catch (e) {
    console.error("[POST /api/sales/set-commission-status]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
