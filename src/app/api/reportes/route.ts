import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSales, getExpenses } from "@/lib/google-sheets";
import { Sale } from "@/types";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPrevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthOffset(month: string, offset: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}

function filterByMonth(sales: Sale[], m: string) {
  return sales.filter((s) => {
    const d = s.saleDate || s.createdAt;
    return d && d.startsWith(m);
  });
}

function computeMetrics(sales: Sale[]) {
  const gross = sales.reduce((acc, s) => acc + s.amount, 0);
  const commissions = sales.reduce((acc, s) => acc + s.commission, 0);
  return { count: sales.length, gross, commissions, avgTicket: sales.length > 0 ? gross / sales.length : 0 };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const token = (session as { accessToken?: string } | null)?.accessToken;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || currentMonth();
    const prevMonth = getPrevMonth(month);

    const [allSales, allExpenses] = await Promise.all([getSales(token), getExpenses(token)]);

    const monthSales = filterByMonth(allSales, month);
    const prevSales = filterByMonth(allSales, prevMonth);
    const monthExpenses = allExpenses.filter((e) => e.month === month);
    const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.amount, 0);

    const clientMap: Record<string, number> = {};
    monthSales.forEach((s) => { clientMap[s.clientName] = (clientMap[s.clientName] || 0) + s.amount; });
    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    const productMap: Record<string, number> = {};
    monthSales.forEach((s) => {
      const key = s.product || "Sin categoría";
      productMap[key] = (productMap[key] || 0) + s.amount;
    });
    const products = Object.entries(productMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount }));

    const expenseByCat: Record<string, number> = {};
    monthExpenses.forEach((e) => { expenseByCat[e.category] = (expenseByCat[e.category] || 0) + e.amount; });

    const trend = Array.from({ length: 6 }, (_, i) => {
      const m = getMonthOffset(month, -(5 - i));
      const s = filterByMonth(allSales, m);
      const exp = allExpenses.filter((e) => e.month === m);
      return {
        month: m,
        label: formatMonthLabel(m),
        gross: s.reduce((acc, v) => acc + v.amount, 0),
        commissions: s.reduce((acc, v) => acc + v.commission, 0),
        expenses: exp.reduce((acc, e) => acc + e.amount, 0),
        count: s.length,
      };
    });

    const sortedSales = [...monthSales].sort((a, b) =>
      (a.saleDate || a.createdAt).localeCompare(b.saleDate || b.createdAt)
    );

    return NextResponse.json({
      month,
      current: { ...computeMetrics(monthSales), expenses: totalExpenses },
      prev: computeMetrics(prevSales),
      expenseByCat,
      topClients,
      products,
      trend,
      sales: sortedSales,
    });
  } catch (e) {
    console.error("[GET /api/reportes]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
