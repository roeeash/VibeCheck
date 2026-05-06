import React, { useCallback, useRef, useState } from 'react';
import type { AuditResult, Phase } from './types.js';
import { startAudit } from './lib/api.js';
import { Header } from './components/header.js';
import { Hero } from './components/hero.js';
import { ScanProgress } from './components/scan-progress.js';
import { LightningStrike } from './components/lightning-strike.js';
import { ResultsDashboard } from './components/results-dashboard.js';

export function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const auditPromiseRef = useRef<Promise<AuditResult> | null>(null);

  const handleScan = useCallback(() => {
    setScanError(null);
    setResult(null);
    auditPromiseRef.current = startAudit(url.trim());
    setPhase('scanning');
  }, [url]);

  const handleScanComplete = useCallback((auditResult: AuditResult) => {
    setResult(auditResult);
    setPhase('strike');
  }, []);

  const handleScanError = useCallback((msg: string) => {
    setScanError(msg);
    setPhase('idle');
    auditPromiseRef.current = null;
  }, []);

  const handleStrikeDone = useCallback(() => {
    setPhase('results');
  }, []);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setScanError(null);
    auditPromiseRef.current = null;
  }, []);

  return (
    <>
      <Header />
      {phase === 'idle' && (
        <Hero url={url} setUrl={setUrl} onScan={handleScan} error={scanError ?? undefined} />
      )}
      {(phase === 'scanning' || phase === 'strike') && auditPromiseRef.current && (
        <ScanProgress
          url={url}
          auditPromise={auditPromiseRef.current}
          onComplete={handleScanComplete}
          onError={handleScanError}
        />
      )}
      {phase === 'strike' && (
        <LightningStrike onDone={handleStrikeDone} />
      )}
      {phase === 'results' && result && (
        <ResultsDashboard result={result} url={url} onReset={handleReset} />
      )}
    </>
  );
}
