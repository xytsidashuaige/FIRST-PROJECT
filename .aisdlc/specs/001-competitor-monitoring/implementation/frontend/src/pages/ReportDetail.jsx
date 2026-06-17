import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ReportDetail.css';

function ReportDetail() {
  const { date } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchReport();
  }, [date]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reports/${date}`);
      setReport(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`该日期 (${date}) 暂无日报`);
      } else {
        setError(err.response?.data?.error || '加载日报失败');
      }
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeBadge = (changeType) => {
    const badges = {
      pricing: { bg: '#FFE5E5', color: '#D32F2F' },
      content: { bg: '#E3F2FD', color: '#1976D2' },
      structure: { bg: '#F3E5F5', color: '#7B1FA2' },
      other: { bg: '#F5F5F5', color: '#616161' },
    };
    const badge = badges[changeType] || badges.other;
    return badge;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return <div className="report-detail-container"><div className="loading">加载中...</div></div>;
  }

  if (error) {
    return (
      <div className="report-detail-container">
        <div className="error-banner">{error}</div>
        <button className="btn-back" onClick={() => navigate('/competitors')}>返回竞对列表</button>
      </div>
    );
  }

  if (!report || !report.content) {
    return (
      <div className="report-detail-container">
        <div className="empty">暂无日报数据</div>
        <button className="btn-back" onClick={() => navigate('/competitors')}>返回竞对列表</button>
      </div>
    );
  }

  const { content } = report;

  return (
    <div className="report-detail-container">
      <div className="report-header">
        <h1>Lensmor Monitor - 竞对日报详情</h1>
        <div className="report-meta">
          <span className="report-date">📅 {formatDate(content.report_date)}</span>
          <span className="report-changes">🔍 发现 {content.total_changes} 处变化</span>
        </div>
      </div>

      {content.competitors.length === 0 ? (
        <div className="empty-report">
          <p>该日期未发现任何变化</p>
        </div>
      ) : (
        <div className="competitors-report">
          {content.competitors.map((competitor) => (
            <div key={competitor.competitor_id} className="competitor-section">
              <h2 className="competitor-name">
                {competitor.competitor_name}
                <span className="change-count">({competitor.changes.length} 处变化)</span>
              </h2>

              <div className="changes-list">
                {competitor.changes.map((change, idx) => {
                  const badge = getChangeTypeBadge(change.change_type);
                  return (
                    <div key={idx} className="change-item">
                      <div className="change-header">
                        <span className="change-field">
                          <strong>{change.field}</strong>
                        </span>
                        <span
                          className="change-type-badge"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {change.change_type}
                        </span>
                      </div>

                      <div className="change-content">
                        <div className="change-row">
                          <span className="label">原值：</span>
                          <code className="old-value">{change.old_value}</code>
                        </div>
                        <div className="arrow">→</div>
                        <div className="change-row">
                          <span className="label">新值：</span>
                          <code className="new-value">{change.new_value}</code>
                        </div>
                      </div>

                      <div className="change-description">
                        {change.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="report-footer">
        <button className="btn-back" onClick={() => navigate('/competitors')}>
          ← 返回竞对列表
        </button>
        <span className="report-time">
          生成于: {new Date(content.generated_at).toLocaleString('zh-CN')}
        </span>
      </div>
    </div>
  );
}

export default ReportDetail;
