import React, { useState, useEffect } from 'react';
import '../styles/CompetitorForm.css';

function CompetitorForm({ onSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        remarks: initialData.remarks || ''
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = '竞对名称不能为空';
    }

    if (formData.url && !/^https?:\/\//.test(formData.url)) {
      newErrors.url = 'URL 格式不正确，请输入有效网址';
    }

    if (formData.remarks && formData.remarks.length > 500) {
      newErrors.remarks = '备注超过 500 字';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="competitor-form">
      <h2>{initialData ? '编辑竞对' : '新增竞对'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">竞对名称 <span className="required">*</span></label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="输入竞对名称"
            disabled={submitting}
          />
          {errors.name && <div className="error-message">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="url">竞对 URL</label>
          <input
            id="url"
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://example.com"
            disabled={submitting}
          />
          {errors.url && <div className="error-message">{errors.url}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="remarks">备注</label>
          <textarea
            id="remarks"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="可选，最多 500 字"
            rows="4"
            disabled={submitting}
          />
          <div className="char-count">{formData.remarks.length}/500</div>
          {errors.remarks && <div className="error-message">{errors.remarks}</div>}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={submitting}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default CompetitorForm;
