const MAX_BODY_CHARS = 450000;

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const decodeHtmlEntities = (value) => value
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
);

const pickMeta = (html, name) => {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  return html.match(pattern)?.[1] || '';
};

const pickTag = (html, tag) => {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const value = html.match(pattern)?.[1] || '';
  return value ? stripTags(value) : '';
};

const pickPrices = (text) => {
  const matches = text.match(/(?:[¥￥$€£]\s?\d[\d,.]*|\d[\d,.]*\s?(?:元|美元|USD|RMB|CNY))/gi) || [];
  return Array.from(new Set(matches.map(normalizeWhitespace))).slice(0, 5);
};

const extractVisibleText = (html) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  return stripTags(withoutScripts).slice(0, 12000);
};

const parseHtml = (html, url, finalUrl) => {
  const text = extractVisibleText(html);
  const title = pickTag(html, 'title');
  const headline = pickTag(html, 'h1') || title;
  const description = pickMeta(html, 'description') || pickMeta(html, 'og:description');
  const brand = pickMeta(html, 'og:site_name') || new URL(finalUrl || url).hostname.replace(/^www\./, '');
  const prices = pickPrices(text);

  return {
    sourceType: 'html',
    url,
    finalUrl: finalUrl || url,
    brand,
    title,
    headline,
    description,
    price: prices[0] || '',
    prices,
    contentLength: html.length,
    textLength: text.length,
    textSample: text.slice(0, 900),
  };
};

const fetchTarget = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 LensmorMonitor/1.0',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const tryJsonEndpoint = async (targetUrl) => {
  if (targetUrl.pathname.endsWith('.json')) {
    return null;
  }

  const jsonUrl = new URL(targetUrl.toString());
  jsonUrl.pathname = `${jsonUrl.pathname.replace(/\/$/, '')}/data.json`;
  jsonUrl.search = '';

  try {
    const response = await fetchTarget(jsonUrl.toString());
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const parsed = JSON.parse(await response.text());
    return {
      sourceType: 'json',
      url: targetUrl.toString(),
      finalUrl: response.url,
      ...parsed,
    };
  } catch (error) {
    return null;
  }
};

module.exports = async (request, response) => {
  if (request.method !== 'GET') {
    return json(response, 405, { error: 'Method not allowed' });
  }

  const rawUrl = request.query?.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return json(response, 400, { error: 'Missing url' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch (error) {
    return json(response, 400, { error: 'Invalid url' });
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return json(response, 400, { error: 'Only http and https URLs are supported' });
  }

  try {
    const jsonData = await tryJsonEndpoint(targetUrl);
    if (jsonData) {
      return json(response, 200, jsonData);
    }

    const targetResponse = await fetchTarget(targetUrl.toString());
    const contentType = targetResponse.headers.get('content-type') || '';
    const body = (await targetResponse.text()).slice(0, MAX_BODY_CHARS);

    if (!targetResponse.ok) {
      return json(response, 502, {
        error: `Target returned HTTP ${targetResponse.status}`,
        status: targetResponse.status,
        url: targetUrl.toString(),
      });
    }

    if (contentType.includes('application/json') || targetUrl.pathname.endsWith('.json')) {
      try {
        const parsed = JSON.parse(body);
        return json(response, 200, {
          sourceType: 'json',
          url: targetUrl.toString(),
          finalUrl: targetResponse.url,
          ...parsed,
        });
      } catch (error) {
        return json(response, 502, { error: 'Target returned invalid JSON' });
      }
    }

    return json(response, 200, parseHtml(body, targetUrl.toString(), targetResponse.url));
  } catch (error) {
    const message = error.name === 'AbortError' ? 'Request timed out' : error.message;
    return json(response, 502, { error: message });
  }
};
