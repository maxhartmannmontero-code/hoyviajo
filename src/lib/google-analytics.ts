export interface GAMonthlyData {
  month: string;
  sessions: number;
  activeUsers: number;
  pageViews: number;
  newUsers: number;
  bounceRate: number;
}

export async function getGA4MonthlyData(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<GAMonthlyData[]> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) throw new Error("not_configured");

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "yearMonth" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "newUsers" },
          { name: "bounceRate" },
        ],
        orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `GA4 API error ${res.status}`);
  }

  const data = await res.json();
  const rows: GAMonthlyData[] = (data.rows ?? []).map(
    (row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => {
      const ym = row.dimensionValues[0].value; // YYYYMM
      const [sessions, activeUsers, pageViews, newUsers, bounceRate] =
        row.metricValues.map((v) => parseFloat(v.value) || 0);
      return {
        month: `${ym.slice(0, 4)}-${ym.slice(4)}`,
        sessions, activeUsers, pageViews, newUsers, bounceRate,
      };
    }
  );

  return rows;
}
