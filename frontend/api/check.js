const { json, supabaseRequest, handleError, readBody } = require('./_supabase');
const { stableStringify, toComparableData, getChangeDetails } = require('./_compare');

const buildInternalUrl = (request, targetUrl) => {
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers.host;
  return `${protocol}://${host}/api/scrape?url=${encodeURIComponent(targetUrl)}`;
};

module.exports = async (request, response) => {
  try {
    if (request.method !== 'POST') {
      return json(response, 405, { error: 'Method not allowed' });
    }

    const { competitorId } = readBody(request);
    if (!competitorId) {
      return json(response, 400, { error: 'Missing competitorId' });
    }

    const competitorResult = await supabaseRequest(`competitors?id=eq.${encodeURIComponent(competitorId)}&select=*&limit=1`);
    const competitor = competitorResult.data[0];

    if (!competitor) {
      return json(response, 404, { error: '竞对不存在' });
    }

    if (!competitor.url) {
      return json(response, 400, { error: '缺少 URL，无法检测' });
    }

    const scrapeResponse = await fetch(buildInternalUrl(request, competitor.url), {
      headers: { Accept: 'application/json' },
    });
    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      return json(response, scrapeResponse.status, {
        error: scrapeData.error || `抓取失败：HTTP ${scrapeResponse.status}`,
      });
    }

    const previousSnapshotResult = await supabaseRequest(
      `monitor_snapshots?competitor_id=eq.${encodeURIComponent(competitor.id)}&select=*&order=captured_at.desc&limit=1`
    );
    const previousSnapshot = previousSnapshotResult.data[0];
    const previousData = previousSnapshot?.comparable_data || {};
    const comparableData = toComparableData(scrapeData);
    const fingerprint = stableStringify(comparableData);
    const checkedAt = new Date().toISOString();
    const hasPrevious = Boolean(previousSnapshot);
    const changed = hasPrevious && previousSnapshot.fingerprint !== fingerprint;
    const changeDetails = getChangeDetails(previousData, comparableData);
    const changedFields = changeDetails.map((change) => change.field);

    await supabaseRequest('monitor_snapshots', {
      method: 'POST',
      body: JSON.stringify({
        competitor_id: competitor.id,
        fingerprint,
        data: scrapeData,
        comparable_data: comparableData,
        captured_at: checkedAt,
      }),
    });

    if (changed && changeDetails.length > 0) {
      await supabaseRequest('change_events', {
        method: 'POST',
        body: JSON.stringify({
          competitor_id: competitor.id,
          competitor_name: competitor.name,
          url: competitor.url,
          changed_fields: changedFields,
          change_details: changeDetails,
          detected_at: checkedAt,
        }),
      });
    }

    const result = {
      status: !hasPrevious ? 'first' : changed && changeDetails.length > 0 ? 'changed' : 'unchanged',
      message: !hasPrevious
        ? '首次抓取完成，已保存基准快照'
        : changed && changeDetails.length > 0
          ? `页面已修改：${changedFields.join('、') || '内容'}`
          : '页面未发现变化',
      changedFields,
      changeDetails,
      checkedAt,
    };

    return json(response, 200, result);
  } catch (error) {
    return handleError(response, error);
  }
};
