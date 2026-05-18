const truncate = (value, maxLength) => {
  const text = String(value ?? '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

const areaLabel = {
  install: '설치',
  hermes: 'Hermes 설정',
  project: '프로젝트 생성',
  approval: '승인/실행',
  sync: '동기화',
  other: '기타',
};

const easeLabel = {
  easy: '쉬웠음',
  confusing: '헷갈림',
  blocked: '막힘',
};

const easeColor = {
  easy: 0x2f855a,
  confusing: 0xc27803,
  blocked: 0xc2410c,
};

export const createDiscordNotifier = ({ webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL ?? '', fetchImpl = fetch } = {}) => {
  const enabled = Boolean(webhookUrl.trim());

  const notifyFeedback = async (entry) => {
    if (!enabled) return { ok: true, skipped: true };

    const response = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'QARKO OS Feedback',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: `새 피드백: ${areaLabel[entry.area] ?? entry.area}`,
            description: truncate(entry.message, 1800),
            color: easeColor[entry.ease] ?? 0x475569,
            fields: [
              { name: '상태', value: easeLabel[entry.ease] ?? entry.ease, inline: true },
              { name: '테스터', value: truncate(entry.testerName || '미입력', 120), inline: true },
              { name: '연락처', value: truncate(entry.testerContact || '미입력', 120), inline: true },
              { name: '앱 버전', value: truncate(entry.appVersion || '0.1.0', 80), inline: true },
              { name: '작성 시각', value: truncate(entry.createdAt || new Date().toISOString(), 120), inline: true },
              { name: 'ID', value: truncate(entry.id, 120), inline: true },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Discord webhook failed (${response.status}): ${body || response.statusText}`);
    }

    return { ok: true, skipped: false };
  };

  return {
    enabled,
    notifyFeedback,
  };
};
