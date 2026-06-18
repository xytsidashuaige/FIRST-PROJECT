const { json, supabaseRequest, handleError, readBody } = require('./_supabase');

const validateCompetitor = ({ name, url }) => {
  if (!name || !name.trim()) {
    const error = new Error('竞对名称不能为空');
    error.statusCode = 400;
    throw error;
  }

  if (url && !/^https?:\/\//.test(url)) {
    const error = new Error('URL 格式不正确，请输入 http 或 https 地址');
    error.statusCode = 400;
    throw error;
  }
};

module.exports = async (request, response) => {
  try {
    if (request.method === 'GET') {
      const page = Math.max(parseInt(request.query?.page || '1', 10), 1);
      const limit = Math.max(parseInt(request.query?.limit || '10', 10), 1);
      const offset = (page - 1) * limit;
      const rangeTo = offset + limit - 1;

      const result = await supabaseRequest(
        `competitors?select=*&order=created_at.desc`,
        {
          headers: {
            Prefer: 'count=exact',
            Range: `${offset}-${rangeTo}`,
          },
        }
      );

      const contentRange = result.headers.get('content-range') || '';
      const total = parseInt(contentRange.split('/')[1] || `${result.data.length}`, 10);

      return json(response, 200, {
        data: result.data,
        total,
        page,
        limit,
      });
    }

    if (request.method === 'POST') {
      const { name, url, remarks } = readBody(request);
      validateCompetitor({ name, url });

      const result = await supabaseRequest('competitors?select=*', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name: name.trim(),
          url: url || null,
          remarks: remarks || null,
        }),
      });

      return json(response, 201, result.data[0]);
    }

    return json(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    return handleError(response, error);
  }
};
