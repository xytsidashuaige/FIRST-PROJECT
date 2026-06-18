const { json, supabaseRequest, handleError, readBody } = require('../_supabase');

const validateUrl = (url) => {
  if (url && !/^https?:\/\//.test(url)) {
    const error = new Error('URL 格式不正确，请输入 http 或 https 地址');
    error.statusCode = 400;
    throw error;
  }
};

module.exports = async (request, response) => {
  try {
    const { id } = request.query || {};

    if (!id) {
      return json(response, 400, { error: 'Missing competitor id' });
    }

    if (request.method === 'PUT') {
      const { name, url, remarks } = readBody(request);

      if (name !== undefined && !name.trim()) {
        return json(response, 400, { error: '竞对名称不能为空' });
      }

      validateUrl(url);

      const updatePayload = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updatePayload.name = name.trim();
      if (url !== undefined) updatePayload.url = url || null;
      if (remarks !== undefined) updatePayload.remarks = remarks || null;

      const result = await supabaseRequest(`competitors?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(updatePayload),
      });

      if (!result.data.length) {
        return json(response, 404, { error: '竞对不存在' });
      }

      return json(response, 200, result.data[0]);
    }

    if (request.method === 'DELETE') {
      await supabaseRequest(`competitors?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      return json(response, 200, { message: '竞对已删除' });
    }

    return json(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    return handleError(response, error);
  }
};
