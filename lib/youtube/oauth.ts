export type YouTubeConfig = {
  apiKey: string | undefined;
  clientId: string | undefined;
  clientSecret: string | undefined;
  refreshToken: string | undefined;
  channelId: string | undefined;
};

export function readYouTubeConfig(): YouTubeConfig {
  return {
    apiKey: process.env.YOUTUBE_API_KEY,
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    channelId: process.env.YOUTUBE_CHANNEL_ID,
  };
}

export function hasYouTubeOAuth(config: YouTubeConfig = readYouTubeConfig()): boolean {
  return Boolean(
    config.clientId?.trim() &&
      config.clientSecret?.trim() &&
      config.refreshToken?.trim(),
  );
}

/** OAuth アクセストークンを更新して返す。 */
export async function refreshYouTubeAccessToken(
  config: YouTubeConfig = readYouTubeConfig(),
): Promise<string> {
  const { clientId, clientSecret, refreshToken } = config;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube Analytics API の OAuth 設定がありません");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("YouTube OAuth トークンの更新に失敗しました");
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("YouTube OAuth トークンが空です");
  }
  return json.access_token;
}

export function channelFilterForAnalytics(
  config: YouTubeConfig = readYouTubeConfig(),
): string {
  return config.channelId?.trim()
    ? `channel==${config.channelId.trim()}`
    : "channel==MINE";
}
