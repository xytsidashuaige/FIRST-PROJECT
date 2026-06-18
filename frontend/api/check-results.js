const { json, supabaseRequest, handleError } = require('./_supabase');

const mapEvent = (event) => ({
  id: String(event.id),
  competitorId: event.competitor_id,
  competitorName: event.competitor_name,
  url: event.url,
  checkedAt: event.detected_at,
  changedFields: event.changed_fields || [],
  changeDetails: event.change_details || [],
});

module.exports = async (request, response) => {
  try {
    if (request.method !== 'GET') {
      return json(response, 405, { error: 'Method not allowed' });
    }

    const snapshotsResult = await supabaseRequest(
      'monitor_snapshots?select=competitor_id,captured_at&order=captured_at.desc&limit=1000'
    );
    const eventsResult = await supabaseRequest(
      'change_events?select=*&order=detected_at.desc&limit=1000'
    );

    const latestSnapshotByCompetitor = {};
    for (const snapshot of snapshotsResult.data) {
      if (!latestSnapshotByCompetitor[snapshot.competitor_id]) {
        latestSnapshotByCompetitor[snapshot.competitor_id] = snapshot;
      }
    }

    const latestEventByCompetitor = {};
    for (const event of eventsResult.data) {
      if (!latestEventByCompetitor[event.competitor_id]) {
        latestEventByCompetitor[event.competitor_id] = mapEvent(event);
      }
    }

    const checkResults = Object.fromEntries(
      Object.entries(latestSnapshotByCompetitor).map(([competitorId, snapshot]) => {
        const latestEvent = latestEventByCompetitor[Number(competitorId)];
        const eventIsLatest = latestEvent && new Date(latestEvent.checkedAt) >= new Date(snapshot.captured_at);
        return [
          competitorId,
          {
            status: eventIsLatest ? 'changed' : 'unchanged',
            message: eventIsLatest
              ? `页面已修改：${latestEvent.changedFields.join('、') || '内容'}`
              : latestEvent
                ? `最近一次变化：${latestEvent.changedFields.join('、') || '内容'}`
                : '页面未发现变化',
            changedFields: eventIsLatest ? latestEvent.changedFields : [],
            changeDetails: eventIsLatest ? latestEvent.changeDetails : [],
            checkedAt: snapshot.captured_at,
          },
        ];
      })
    );

    return json(response, 200, {
      checkResults,
      latestEvents: Object.values(latestEventByCompetitor),
    });
  } catch (error) {
    return handleError(response, error);
  }
};
