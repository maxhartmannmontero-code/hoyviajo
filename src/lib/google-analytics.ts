export interface GADailySnapshot {
  date: string;
  sessions: number;
  activeUsers: number;
  pageViews: number;
  newUsers: number;
  bounceRate: number;
}

export interface GADailyComparison {
  today: GADailySnapshot;
  yesterday: GADailySnapshot;
}

export async function getGA4DailyComparison(accessToken: string): Promise<GADailyComparison> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) throw new Error("not_configured");

  const todayStr = new Date().toISOString().slice(0, 10);
  const yestDate = new Date(); yestDate.setDate(yestDate.getDate() - 1);
  const yestStr = yestDate.toISOString().slice(0, 10);

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: yestStr, endDate: todayStr }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "newUsers" },
          { name: "bounceRate" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `GA4 API error ${res.status}`);
  }

  const data = await res.json();
  const empty = (date: string): GADailySnapshot => ({ date, sessions: 0, activeUsers: 0, pageViews: 0, newUsers: 0, bounceRate: 0 });

  const snapshots: Record<string, GADailySnapshot> = {};
  for (const row of data.rows ?? []) {
    const raw = row.dimensionValues[0].value as string; // YYYYMMDD
    const date = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6)}`;
    const [sessions, activeUsers, pageViews, newUsers, bounceRate] = row.metricValues.map((v: { value: string }) => parseFloat(v.value) || 0);
    snapshots[date] = { date, sessions, activeUsers, pageViews, newUsers, bounceRate };
  }

  return {
    today:     snapshots[todayStr] ?? empty(todayStr),
    yesterday: snapshots[yestStr]  ?? empty(yestStr),
  };
}

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
