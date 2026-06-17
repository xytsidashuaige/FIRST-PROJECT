import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import CompetitorForm from '../components/CompetitorForm';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import '../styles/CompetitorList.css';

const CHECK_RESULTS_KEY = 'lensmor_check_results';
const SNAPSHOT_KEY = 'lensmor_competitor_snapshots';
const AUTO_CHECK_KEY = 'lensmor_auto_check';
const AUTO_CHECK_INTERVAL_MS = 60000;

const STATUS_COPY = {
  pending: '未检测',
  checking: '检测中',
  first: '首次抓取',
  changed: '发现变化',
  unchanged: '稳定',
  failed: '抓取失败',
};

const STATUS_TONE = {
  pending: 'neutral',
  checking: 'info',
  first: 'success',
  changed: 'warning',
  unchanged: 'success',
  failed: 'danger',
};

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

const readJsonMap = (key) => {
  const saved = window.localStorage.getItem(key);
  return saved ? JSON.parse(saved) : {};
};

const writeJsonMap = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const buildProbeUrl = (url) => {
  const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const probeUrl = normalizedUrl.endsWith('.json') ? normalizedUrl : `${normalizedUrl}/data.json`;
  const separator = probeUrl.includes('?') ? '&' : '?';
  return `${probeUrl}${separator}ts=${Date.now()}`;
};

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

function CompetitorList() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [checkResults, setCheckResults] = useState({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(
    () => window.localStorage.getItem(AUTO_CHECK_KEY) === 'true'
  );

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
  const useLocalDemo = !process.env.REACT_APP_API_URL && window.location.hostname !== 'localhost';

  const readLocalCompetitors = () => {
    const saved = window.localStorage.getItem('lensmor_competitors');
    if (saved) {
      return JSON.parse(saved);
    }

    return [
      {
        id: 1,
        name: 'Demo Competitor',
        url: 'https://example.com',
        remarks: 'Vercel demo data',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  };

  const writeLocalCompetitors = (nextCompetitors) => {
    window.localStorage.setItem('lensmor_competitors', JSON.stringify(nextCompetitors));
  };

  const saveCheckResult = useCallback((competitorId, result) => {
    setCheckResults((current) => {
      const next = { ...current, [competitorId]: result };
      writeJsonMap(CHECK_RESULTS_KEY, next);
      return next;
    });
  }, []);

  const fetchCompetitors = useCallback(async () => {
    try {
      setLoading(true);
      if (useLocalDemo) {
        const localCompetitors = readLocalCompetitors();
        setCompetitors(localCompetitors);
        setTotal(localCompetitors.length);
        setError(null);
        return;
      }

      const response = await axios.get(`${API_BASE}/competitors`, {
        params: { page, limit: 10 },
      });
      setCompetitors(response.data.data);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError('加载竞对列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, page, useLocalDemo]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  useEffect(() => {
    setCheckResults(readJsonMap(CHECK_RESULTS_KEY));
  }, []);

  const handleCheckCompetitor = useCallback(async (competitor, options = {}) => {
    if (!competitor.url) {
      saveCheckResult(competitor.id, {
        status: 'failed',
        message: '缺少 URL，无法检测',
        checkedAt: new Date().toISOString(),
        changeDetails: [],
      });
      return;
    }

    if (!options.silent) {
      saveCheckResult(competitor.id, {
        status: 'checking',
        message: '正在抓取页面数据...',
        checkedAt: new Date().toISOString(),
        changeDetails: [],
      });
    }

    try {
      const response = await fetch(buildProbeUrl(competitor.url), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const snapshots = readJsonMap(SNAPSHOT_KEY);
      const snapshotKey = String(competitor.id);
      const previousSnapshot = snapshots[snapshotKey];
      const nextFingerprint = stableStringify(data);
      const hasPrevious = Boolean(previousSnapshot);
      const changed = hasPrevious && previousSnapshot.fingerprint !== nextFingerprint;
      const changeDetails = getChangeDetails(previousSnapshot?.data, data);
      const changedFields = changeDetails.map((item) => item.field);

      snapshots[snapshotKey] = {
        fingerprint: nextFingerprint,
        data,
        capturedAt: new Date().toISOString(),
      };
      writeJsonMap(SNAPSHOT_KEY, snapshots);

      saveCheckResult(competitor.id, {
        status: !hasPrevious ? 'first' : changed ? 'changed' : 'unchanged',
        message: !hasPrevious
          ? '首次抓取完成，已保存基准快照'
          : changed
            ? `页面已修改：${changedFields.join('、') || '内容'}`
            : '页面未发现变化',
        changedFields,
        changeDetails,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      saveCheckResult(competitor.id, {
        status: 'failed',
        message: `抓取失败：${err.message}`,
        checkedAt: new Date().toISOString(),
        changeDetails: [],
      });
    }
  }, [saveCheckResult]);

  useEffect(() => {
    if (!autoCheckEnabled || competitors.length === 0) {
      return undefined;
    }

    const checkAll = () => {
      competitors
        .filter((competitor) => competitor.url)
        .forEach((competitor) => handleCheckCompetitor(competitor, { silent: true }));
    };

    checkAll();
    const intervalId = window.setInterval(checkAll, AUTO_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [autoCheckEnabled, competitors, handleCheckCompetitor]);

  const stats = useMemo(() => {
    const values = competitors.map((competitor) => checkResults[competitor.id]?.status || 'pending');
    return {
      total: competitors.length,
      changed: values.filter((status) => status === 'changed').length,
      stable: values.filter((status) => status === 'unchanged' || status === 'first').length,
      failed: values.filter((status) => status === 'failed').length,
      checking: values.filter((status) => status === 'checking').length,
    };
  }, [competitors, checkResults]);

  const filteredCompetitors = useMemo(() => {
    return competitors.filter((competitor) => {
      const status = checkResults[competitor.id]?.status || 'pending';
      const queryText = `${competitor.name || ''} ${competitor.url || ''}`.toLowerCase();
      const matchesQuery = queryText.includes(query.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [competitors, checkResults, query, statusFilter]);

  const recentChanges = useMemo(() => {
    return competitors
      .map((competitor) => ({
        competitor,
        result: checkResults[competitor.id],
      }))
      .filter((item) => item.result?.status === 'changed')
      .sort((a, b) => new Date(b.result.checkedAt) - new Date(a.result.checkedAt))
      .slice(0, 4);
  }, [competitors, checkResults]);

  const lastCheckedAt = useMemo(() => {
    const timestamps = Object.values(checkResults)
      .map((result) => result?.checkedAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a));
    return timestamps[0];
  }, [checkResults]);

  const handleAutoCheckToggle = (event) => {
    const enabled = event.target.checked;
    setAutoCheckEnabled(enabled);
    window.localStorage.setItem(AUTO_CHECK_KEY, String(enabled));
  };

  const handleCheckAll = () => {
    competitors
      .filter((competitor) => competitor.url)
      .forEach((competitor) => handleCheckCompetitor(competitor));
  };

  const handleAddCompetitor = async (formData) => {
    try {
      if (useLocalDemo) {
        const localCompetitors = readLocalCompetitors();
        const now = new Date().toISOString();
        const nextCompetitors = [
          {
            id: Date.now(),
            name: formData.name,
            url: formData.url,
            remarks: formData.remarks || '',
            active: true,
            created_at: now,
            updated_at: now,
          },
          ...localCompetitors,
        ];
        writeLocalCompetitors(nextCompetitors);
        setShowForm(false);
        setCompetitors(nextCompetitors);
        setTotal(nextCompetitors.length);
        setError(null);
        return;
      }

      await axios.post(`${API_BASE}/competitors`, formData);
      setShowForm(false);
      fetchCompetitors();
    } catch (err) {
      setError(err.response?.data?.error || '新增竞对失败');
    }
  };

  const handleEditCompetitor = async (id, formData) => {
    try {
      if (useLocalDemo) {
        const localCompetitors = readLocalCompetitors();
        const nextCompetitors = localCompetitors.map((competitor) => (
          competitor.id === id
            ? { ...competitor, ...formData, updated_at: new Date().toISOString() }
            : competitor
        ));
        writeLocalCompetitors(nextCompetitors);
        setEditingId(null);
        setShowForm(false);
        setCompetitors(nextCompetitors);
        setTotal(nextCompetitors.length);
        setError(null);
        return;
      }

      await axios.put(`${API_BASE}/competitors/${id}`, formData);
      setEditingId(null);
      setShowForm(false);
      fetchCompetitors();
    } catch (err) {
      setError(err.response?.data?.error || '编辑竞对失败');
    }
  };

  const handleDeleteCompetitor = async (id) => {
    try {
      if (useLocalDemo) {
        const nextCompetitors = readLocalCompetitors().filter((competitor) => competitor.id !== id);
        writeLocalCompetitors(nextCompetitors);
        setDeleteConfirm(null);
        setCompetitors(nextCompetitors);
        setTotal(nextCompetitors.length);
        setError(null);
        return;
      }

      await axios.delete(`${API_BASE}/competitors/${id}`);
      setDeleteConfirm(null);
      fetchCompetitors();
    } catch (err) {
      setError(err.response?.data?.error || '删除竞对失败');
    }
  };

  return (
    <div className="monitor-shell">
      <header className="monitor-topbar">
        <div>
          <p className="product-kicker">Lensmor Monitor</p>
          <h1>竞对监控工作台</h1>
          <p className="topbar-subtitle">跟踪竞品页面、识别字段变化、保留最近检测结果。</p>
        </div>
        <div className="topbar-actions">
          <label className={`switch-control ${autoCheckEnabled ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={autoCheckEnabled}
              onChange={handleAutoCheckToggle}
            />
            <span className="switch-track" />
            <span>{autoCheckEnabled ? '自动检测已开启' : '自动检测关闭'}</span>
          </label>
          <button className="btn-secondary" onClick={handleCheckAll} disabled={competitors.length === 0}>
            全部检测
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
          >
            + 新增竞对
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="overview-grid">
        <div className="metric-card">
          <span>监控目标</span>
          <strong>{stats.total}</strong>
          <small>当前在线竞对</small>
        </div>
        <div className="metric-card warning">
          <span>发现变化</span>
          <strong>{stats.changed}</strong>
          <small>需要关注</small>
        </div>
        <div className="metric-card success">
          <span>稳定目标</span>
          <strong>{stats.stable}</strong>
          <small>最近检测正常</small>
        </div>
        <div className="metric-card danger">
          <span>抓取异常</span>
          <strong>{stats.failed}</strong>
          <small>{stats.checking > 0 ? `${stats.checking} 个检测中` : '无运行中任务'}</small>
        </div>
      </section>

      <section className="workspace-grid">
        <main className="monitor-panel">
          <div className="panel-header">
            <div>
              <h2>监控目标</h2>
              <p>{lastCheckedAt ? `最近检测：${new Date(lastCheckedAt).toLocaleString()}` : '等待首次检测'}</p>
            </div>
            <div className="table-tools">
              <input
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索竞对名称或 URL"
              />
              <select
                className="status-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="changed">发现变化</option>
                <option value="unchanged">稳定</option>
                <option value="first">首次抓取</option>
                <option value="failed">抓取失败</option>
                <option value="pending">未检测</option>
              </select>
            </div>
          </div>

          {showForm && (
            <CompetitorForm
              onSubmit={(data) => {
                if (editingId) {
                  handleEditCompetitor(editingId, data);
                } else {
                  handleAddCompetitor(data);
                }
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              initialData={editingId ? competitors.find(c => c.id === editingId) : null}
            />
          )}

          {loading ? (
            <div className="loading">加载中...</div>
          ) : filteredCompetitors.length === 0 ? (
            <div className="empty">暂无匹配的监控目标</div>
          ) : (
            <div className="table-wrap">
              <table className="competitors-table">
                <thead>
                  <tr>
                    <th>竞对</th>
                    <th>URL</th>
                    <th>状态</th>
                    <th>最近变化</th>
                    <th>添加时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompetitors.map((competitor) => {
                    const checkResult = checkResults[competitor.id];
                    const status = checkResult?.status || 'pending';

                    return (
                      <tr key={competitor.id}>
                        <td>
                          <div className="target-cell">
                            <span className="target-avatar">{competitor.name?.slice(0, 1) || 'C'}</span>
                            <div>
                              <strong>{competitor.name}</strong>
                              <span>ID {competitor.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {competitor.url ? (
                            <a className="url-link" href={competitor.url} target="_blank" rel="noreferrer">
                              {competitor.url}
                            </a>
                          ) : '-'}
                        </td>
                        <td>
                          <div className="status-stack">
                            <span className={`status-badge ${STATUS_TONE[status]}`}>
                              {STATUS_COPY[status]}
                            </span>
                            {checkResult?.checkedAt && (
                              <span className="check-time">
                                {new Date(checkResult.checkedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="change-summary">
                            <span className="check-message">{checkResult?.message || '尚未建立快照'}</span>
                            {checkResult?.changeDetails?.length > 0 && (
                              <div className="change-detail-list">
                                {checkResult.changeDetails.map((change) => (
                                  <div className="change-detail" key={change.field}>
                                    <strong>{change.field}</strong>
                                    <span className="change-values">
                                      <span className="old-value">{change.oldValue}</span>
                                      <span className="arrow">-&gt;</span>
                                      <span className="new-value">{change.newValue}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{new Date(competitor.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn-check"
                              onClick={() => handleCheckCompetitor(competitor)}
                              disabled={status === 'checking'}
                            >
                              检测
                            </button>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                setEditingId(competitor.id);
                                setShowForm(true);
                              }}
                            >
                              编辑
                            </button>
                            <button className="btn-delete" onClick={() => setDeleteConfirm(competitor.id)}>
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</button>
            <span>第 {page} 页</span>
            <button onClick={() => setPage(page + 1)} disabled={page * 10 >= total}>下一页</button>
          </div>
        </main>

        <aside className="side-panel">
          <div className="panel-header compact">
            <div>
              <h2>变化流</h2>
              <p>最近发现的字段级变化</p>
            </div>
          </div>

          {recentChanges.length === 0 ? (
            <div className="activity-empty">
              <strong>暂无变化</strong>
              <span>检测到变化后会在这里显示字段明细。</span>
            </div>
          ) : (
            <div className="activity-list">
              {recentChanges.map(({ competitor, result }) => (
                <div className="activity-item" key={`${competitor.id}-${result.checkedAt}`}>
                  <div className="activity-title">
                    <strong>{competitor.name}</strong>
                    <span>{new Date(result.checkedAt).toLocaleTimeString()}</span>
                  </div>
                  {result.changeDetails.map((change) => (
                    <div className="activity-change" key={change.field}>
                      <span>{change.field}</span>
                      <small>{change.oldValue} -&gt; {change.newValue}</small>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      {deleteConfirm && (
        <DeleteConfirmDialog
          competitorName={competitors.find(c => c.id === deleteConfirm)?.name}
          onConfirm={() => handleDeleteCompetitor(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

export default CompetitorList;
