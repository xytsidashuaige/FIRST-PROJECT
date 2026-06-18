const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const error = new Error('Supabase is not configured');
    error.statusCode = 500;
    throw error;
  }

  return {
    url: url.replace(/\/$/, ''),
    key,
  };
};

const json = (response, statusCode, body, headers = {}) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  response.end(JSON.stringify(body));
};

const supabaseRequest = async (path, options = {}) => {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Supabase request failed: ${response.status}`);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return {
    data,
    headers: response.headers,
    status: response.status,
  };
};

const handleError = (response, error) => {
  const statusCode = error.statusCode || 500;
  json(response, statusCode, {
    error: error.message || 'Internal server error',
    details: error.details,
  });
};

const readBody = (request) => {
  if (!request.body) {
    return {};
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body);
  }

  return request.body;
};

module.exports = {
  json,
  supabaseRequest,
  handleError,
  readBody,
};
