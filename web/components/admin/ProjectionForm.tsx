//web/components/admin/ProjectionForm.tsx
'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../lib/format';

export function ProjectionForm() {
  // Hypothèses de base
  const [totalMembers, setTotalMembers] = useState<number>(150); // Base de membres de l'antenne
  const [participationRate, setParticipationRate] = useState<number>(65); // Pourcentage qui paie
  const [averageContribution, setAverageContribution] = useState<number>(25); // Montant moyen
  const [targetBudget, setTargetBudget] = useState<number>(3000); // Budget visé pour les projets
  const currency = 'EUR';

  // Calculs en temps réel
  const expectedMembersPaying = Math.round(totalMembers * (participationRate / 100));
  const projectedTotal = expectedMembersPaying * averageContribution;
  const balance = projectedTotal - targetBudget;
  const fundingPercentage = targetBudget > 0 ? Math.min(100, (projectedTotal / targetBudget) * 100) : 100;

  return (
    <div className="sim-container">
      {/* Colonne de gauche : Les curseurs de simulation */}
      <div className="sim-controls">
        <h3 className="sim-section-title">Hypothèses de collecte</h3>
        
        <div className="sim-control-group">
          <Input
            label="Membres totaux dans l'antenne"
            type="number"
            min="1"
            value={totalMembers}
            onChange={(e) => setTotalMembers(Number(e.target.value) || 0)}
          />
        </div>

        <div className="sim-control-group">
          <div className="sim-label-row">
            <label>Taux de participation estimé</label>
            <span className="sim-value-badge">{participationRate}%</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={participationRate} 
            onChange={(e) => setParticipationRate(Number(e.target.value))}
            className="sim-slider"
          />
          <div className="sim-slider-marks">
            <span>Pessimiste (30%)</span>
            <span>Réaliste (65%)</span>
            <span>Optimiste (90%)</span>
          </div>
        </div>

        <div className="sim-control-group">
          <div className="sim-label-row">
            <label>Cotisation moyenne espérée</label>
            <span className="sim-value-badge">{formatCurrency(averageContribution, currency)}</span>
          </div>
          <input 
            type="range" 
            min="5" max="150" step="5"
            value={averageContribution} 
            onChange={(e) => setAverageContribution(Number(e.target.value))}
            className="sim-slider"
          />
        </div>

        <div className="sim-control-group" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
          <h3 className="sim-section-title">Objectifs Projets</h3>
          <Input
            label="Budget nécessaire pour les futurs projets"
            type="number"
            min="0"
            step="100"
            value={targetBudget}
            onChange={(e) => setTargetBudget(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Colonne de droite : Les résultats */}
      <div className="sim-results">
        <h3 className="sim-section-title" style={{ color: 'white', opacity: 0.9 }}>Résultats projetés</h3>
        
        <div className="sim-card-main">
          <span className="sim-card-label">Recettes totales estimées</span>
          <span className="sim-card-value">{formatCurrency(projectedTotal, currency)}</span>
          <span className="sim-card-sub">Avec {expectedMembersPaying} membres payeurs</span>
        </div>

        <div className="sim-progress-zone">
          <div className="sim-label-row" style={{ color: 'white', marginBottom: '0.5rem' }}>
            <span>Couverture du budget projets</span>
            <span style={{ fontWeight: 700 }}>{fundingPercentage.toFixed(0)}%</span>
          </div>
          <div className="sim-progress-track">
            <div 
              className="sim-progress-fill" 
              style={{ 
                width: `${fundingPercentage}%`,
                background: fundingPercentage >= 100 ? '#34D399' : '#FBBF24' 
              }} 
            />
          </div>
        </div>

        <div className="sim-grid-results">
          <div className="sim-stat-box">
            <span className="sim-stat-label">Objectif Projets</span>
            <span className="sim-stat-val">{formatCurrency(targetBudget, currency)}</span>
          </div>
          <div className={`sim-stat-box ${balance >= 0 ? 'positive' : 'negative'}`}>
            <span className="sim-stat-label">{balance >= 0 ? 'Excédent prévu' : 'Déficit prévu'}</span>
            <span className="sim-stat-val">
              {balance > 0 ? '+' : ''}{formatCurrency(balance, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}