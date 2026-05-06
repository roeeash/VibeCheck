import React, { useState } from 'react';
import { downloadReportUrl } from '../lib/api.js';

interface DownloadButtonProps {
  auditId: string;
}

export function DownloadButton({ auditId }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = downloadReportUrl(auditId);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VIBE_REPORT_${auditId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn"
      onClick={() => void handleDownload()}
      disabled={loading}
      style={{ borderColor: 'var(--cyan-line)', color: 'var(--cyan)' }}
    >
      {loading ? '…' : '↓'} VIBE_REPORT.md
    </button>
  );
}
