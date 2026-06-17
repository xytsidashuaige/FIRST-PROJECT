import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CompetitorForm from '../components/CompetitorForm';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import '../styles/CompetitorList.css';

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

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
  const useLocalDemo = !process.env.REACT_APP_API_URL && window.location.hostname !== 'localhost';
  const CHECK_RESULTS_KEY = 'lensmor_check_results';
  const SNAPSHOT_KEY = 'lensmor_competitor_snapshots';

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

  const summarizeChanges = (previousData, nextData) => {
    if (!previousData) {
      return [];
    }

    const keys = Array.from(new Set([
      ...Object.keys(previousData || {}),
      ...Object.keys(nextData || {}),
    ]));

    return keys.filter((key) => stableStringify(previousData?.[key]) !== stableStringify(nextData?.[key]));
  };

  const saveCheckResult = (competitorId, result) => {
    setCheckResults((current) => {
      const next = { ...current, [competitorId]: result };
      writeJsonMap(CHECK_RESULTS_KEY, next);
      return next;
    });
  };

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
        params: { page, limit: 10 }
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

  // 加载竞对列表
  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  useEffect(() => {
    setCheckResults(readJsonMap(CHECK_RESULTS_KEY));
  }, []);

  const handleCheckCompetitor = async (competitor) => {
    if (!competitor.url) {
      saveCheckResult(competitor.id, {
        status: 'failed',
        message: '缺少 URL，无法检测',
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    saveCheckResult(competitor.id, {
      status: 'checking',
      message: '正在抓取页面数据...',
      checkedAt: new Date().toISOString(),
    });

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
      const changedFields = summarizeChanges(previousSnapshot?.data, data);

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
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      saveCheckResult(competitor.id, {
        status: 'failed',
        message: `抓取失败：${err.message}`,
        checkedAt: new Date().toISOString(),
      });
    }
  };

  // 新增竞对
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

  // 编辑竞对
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

  // 删除竞对
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
    <div className="competitor-list-container">
      <h1>Lensmor Monitor - 竞对监控平台</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-header">
        <h2>竞对列表 (共 {total} 个在线竞对)</h2>
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
      ) : competitors.length === 0 ? (
        <div className="empty">暂无竞对</div>
      ) : (
        <table className="competitors-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>竞对名称</th>
              <th>URL</th>
              <th>检测状态</th>
              <th>添加时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => {
              const checkResult = checkResults[competitor.id];

              return (
                <tr key={competitor.id}>
                  <td>{competitor.id}</td>
                  <td>{competitor.name}</td>
                  <td>
                    {competitor.url ? (
                      <a href={competitor.url} target="_blank" rel="noreferrer">
                        {competitor.url}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="check-status">
                      <span className={`status-badge ${checkResult?.status || 'pending'}`}>
                        {checkResult?.status === 'checking' && '检测中'}
                        {checkResult?.status === 'first' && '首次抓取'}
                        {checkResult?.status === 'changed' && '已变化'}
                        {checkResult?.status === 'unchanged' && '未变化'}
                        {checkResult?.status === 'failed' && '抓取失败'}
                        {!checkResult && '未检测'}
                      </span>
                      {checkResult?.message && (
                        <span className="check-message">{checkResult.message}</span>
                      )}
                      {checkResult?.checkedAt && (
                        <span className="check-time">
                          {new Date(checkResult.checkedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{new Date(competitor.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-check"
                      onClick={() => handleCheckCompetitor(competitor)}
                      disabled={checkResult?.status === 'checking'}
                    >
                      检测页面
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
                    <button
                      className="btn-delete"
                      onClick={() => setDeleteConfirm(competitor.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {deleteConfirm && (
        <DeleteConfirmDialog
          competitorName={competitors.find(c => c.id === deleteConfirm)?.name}
          onConfirm={() => handleDeleteCompetitor(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>上一页</button>
        <span>第 {page} 页</span>
        <button onClick={() => setPage(page + 1)} disabled={page * 10 >= total}>下一页</button>
      </div>
    </div>
  );
}

export default CompetitorList;
