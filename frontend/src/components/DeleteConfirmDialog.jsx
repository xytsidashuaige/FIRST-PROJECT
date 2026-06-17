import React, { useState } from 'react';
import '../styles/DeleteConfirmDialog.css';

function DeleteConfirmDialog({ competitorName, onConfirm, onCancel }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>⚠️ 确认删除</h3>
        </div>
        <div className="modal-body">
          <p>确定要删除竞对 "<strong>{competitorName}</strong>" 吗？</p>
          <p className="warning-text">删除后将停止监控该竞对，但历史日报数据保留。</p>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={deleting}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-delete"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? '删除中...' : '确定删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;
