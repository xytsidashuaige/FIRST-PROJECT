const IGNORED_CHANGE_FIELDS = new Set([
  'sourceType',
  'url',
  'finalUrl',
  'contentLength',
  'textLength',
]);

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(',')}}`;
  }

  return JSON.stringify(value);
};

const formatValue = (value) => {
  if (value === undefined) return '未设置';
  if (value === null) return '空';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const toComparableData = (data = {}) => (
  Object.fromEntries(
    Object.entries(data).filter(([key]) => !IGNORED_CHANGE_FIELDS.has(key))
  )
);

const getChangeDetails = (previousData, nextData) => {
  if (!previousData) {
    return [];
  }

  const keys = Array.from(new Set([
    ...Object.keys(previousData || {}),
    ...Object.keys(nextData || {}),
  ]));

  return keys
    .filter((key) => stableStringify(previousData?.[key]) !== stableStringify(nextData?.[key]))
    .map((key) => ({
      field: key,
      oldValue: formatValue(previousData?.[key]),
      newValue: formatValue(nextData?.[key]),
    }));
};

module.exports = {
  stableStringify,
  toComparableData,
  getChangeDetails,
};
