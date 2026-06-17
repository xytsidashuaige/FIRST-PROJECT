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
              <th>添加时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => (
              <tr key={competitor.id}>
                <td>{competitor.id}</td>
                <td>{competitor.name}</td>
                <td>{competitor.url || '-'}</td>
                <td>{new Date(competitor.created_at).toLocaleDateString()}</td>
                <td>
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
            ))}
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
