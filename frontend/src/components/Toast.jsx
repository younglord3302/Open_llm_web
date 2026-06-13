import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} style={{ color: '#10b981' }} />,
  error:   <AlertCircle  size={16} style={{ color: '#ef4444' }} />,
  info:    <Info         size={16} style={{ color: '#3b82f6' }} />,
};

export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {icons[t.type] || icons.info}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
