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

    const limit = Math.min(Math.max(parseInt(request.query?.limit || '80', 10), 1), 200);
    const result = await supabaseRequest(
      `change_events?select=*&order=detected_at.desc&limit=${limit}`
    );

    return json(response, 200, {
      data: result.data.map(mapEvent),
    });
  } catch (error) {
    return handleError(response, error);
  }
};
