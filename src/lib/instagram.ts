export interface InstagramMonthlyData {
  followersCount: number;
  mediaCount: number;
  reach: number;
  impressions: number;
  profileViews: number;
}

export async function getInstagramInsights(
  accessToken: string,
  accountId: string
): Promise<InstagramMonthlyData> {
  const base = "https://graph.facebook.com/v20.0";

  // Basic account info
  const profileRes = await fetch(
    `${base}/${accountId}?fields=followers_count,media_count&access_token=${accessToken}`
  );
  if (!profileRes.ok) {
    const err = await profileRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Instagram API error ${profileRes.status}`);
  }
  const profile = await profileRes.json();

  // Monthly insights (reach, impressions, profile_views)
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);
  const insightsRes = await fetch(
    `${base}/${accountId}/insights?metric=reach,impressions,profile_views&period=month&since=${since}&until=${until}&access_token=${accessToken}`
  );

  let reach = 0;
  let impressions = 0;
  let profileViews = 0;

  if (insightsRes.ok) {
    const insights = await insightsRes.json();
    for (const item of insights.data ?? []) {
      const val = item.values?.[item.values.length - 1]?.value ?? 0;
      if (item.name === "reach") reach = val;
      if (item.name === "impressions") impressions = val;
      if (item.name === "profile_views") profileViews = val;
    }
  }

  return {
    followersCount: profile.followers_count ?? 0,
    mediaCount: profile.media_count ?? 0,
    reach,
    impressions,
    profileViews,
  };
}
