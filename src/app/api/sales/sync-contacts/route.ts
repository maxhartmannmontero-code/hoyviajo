import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/get-access-token";
import { getSales, getContacts, bulkCreateContacts } from "@/lib/google-sheets";
import type { Contact } from "@/types";

export async function POST() {
  try {
    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [sales, existing] = await Promise.all([
      getSales(token),
      getContacts(token),
    ]);

    // Detect "agent" emails: if an email appears in >15% of records it's not a client email
    const emailCounts = new Map<string, number>();
    for (const s of sales) {
      const e = s.clientEmail?.trim().toLowerCase();
      if (e) emailCounts.set(e, (emailCounts.get(e) || 0) + 1);
    }
    const agentThreshold = sales.length * 0.15;
    const agentEmails = new Set(
      [...emailCounts.entries()]
        .filter(([, count]) => count > agentThreshold)
        .map(([e]) => e)
    );

    const existingNames = new Set(
      existing.map((c) => c.name.toLowerCase().trim())
    );
    const existingEmails = new Set(
      existing.map((c) => c.email.toLowerCase().trim()).filter(Boolean)
    );

    // Deduplicate by name (the real client identifier)
    const seen = new Set<string>();
    const toCreate: Omit<Contact, "id" | "createdAt" | "updatedAt">[] = [];

    for (const s of sales) {
      const name = s.clientName?.trim() || "";
      if (!name) continue;

      const nameKey = name.toLowerCase();
      if (seen.has(nameKey)) continue;
      seen.add(nameKey);

      if (existingNames.has(nameKey)) continue;

      // Only use client email if it's not the agent's repeated email
      const rawEmail = s.clientEmail?.trim() || "";
      const clientEmail = rawEmail && !agentEmails.has(rawEmail.toLowerCase())
        ? rawEmail
        : "";

      if (clientEmail && existingEmails.has(clientEmail.toLowerCase())) continue;

      toCreate.push({
        name,
        email: clientEmail,
        phone: s.clientPhone?.trim() || "",
        company: s.partner?.trim() || "",
        role: "",
        tags: [],
        status: "cliente",
        source: "Importado",
        notes: "",
      });
    }

    const created = await bulkCreateContacts(token, toCreate);

    return NextResponse.json({
      created,
      skipped: seen.size - created,
      debug: {
        totalSales: sales.length,
        salesWithName: sales.filter((s) => s.clientName?.trim()).length,
        uniqueClients: seen.size,
        agentEmailsDetected: [...agentEmails],
      },
    });
  } catch (e) {
    console.error("[POST /api/sales/sync-contacts]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
