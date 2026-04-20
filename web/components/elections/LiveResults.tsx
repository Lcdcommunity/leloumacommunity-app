// web/components/elections/LiveResults.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import type { PositionResult } from '../../types/election';

export function LiveResults({ electionId }: { electionId: string }) {
  const [results, setResults] = useState<PositionResult[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const data = await api.getElectionLiveResults(electionId);
        if (mounted) setResults(data);
      } catch (err) {
        console.error("Erreur live results:", err);
      }
    };

    void fetchData();
    const timer = setInterval(() => { void fetchData(); }, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [electionId]);

  if (results.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>Aucun résultat à afficher pour le moment.</div>;
  }

  return (
    <div className="results-container">
      <style>{`
        .res-pos-block { background: white; padding: 1.5rem; border-radius: 20px; border: 1px solid #E2E8F0; margin-bottom: 1.5rem; }
        .res-pos-title { font-size: 1.2rem; font-weight: 800; color: #1E3A8A; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        .res-total-badge { font-size: 0.7rem; background: #EFF6FF; padding: 0.3rem 0.8rem; border-radius: 99px; color: #2563EB; border: 1px solid #BFDBFE; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .cand-row { margin-bottom: 1.25rem; }
        .cand-info { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 0.5rem; }
        
        .progress-bg { height: 12px; background: #F1F5F9; border-radius: 99px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #2563EB, #60A5FA); border-radius: 99px; transition: width 1s cubic-bezier(0.34, 1.4, 0.64, 1); }
        .percentage-text { color: #2563EB; font-family: 'DM Mono', monospace; font-size: 0.9rem; }
      `}</style>

      {results.map((pos) => (
        <div key={pos.id} className="res-pos-block">
          <div className="res-pos-title">
            {pos.title}
            <span className="res-total-badge">{pos.totalVotes} votes exprimés</span>
          </div>
          
          {pos.results.map((cand) => (
            <div key={cand.candidateId} className="cand-row">
              <div className="cand-info">
                <span>{cand.name}</span>
                <span className="percentage-text">{cand.percentage.toFixed(1)}%</span>
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-fill" 
                  style={{ width: `${cand.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}