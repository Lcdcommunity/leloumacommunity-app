/////// web/app/(protected)/system-admin/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
import { formatDate } from '../../../lib/format';

// ── TYPES ──────────────────────────────────────────────────
type AssociationItem = {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  domainName: string | null;
  createdAt: string;
  _count: { users: number; antennas: number };
};

type SystemDashboardData = {
  stats: { totalAssociations: number; totalUsers: number };
  associations: AssociationItem[];
};

export default function SystemAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<SystemDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedAsso, setSelectedAsso] = useState<AssociationItem | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // 🛡️ Confirmation de suppression renforcée : modale custom + saisie du nom exact
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const fetchDashboardData = () => {
    api.getSystemDashboard()
      .then((res) => setData(res as unknown as SystemDashboardData))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredAssociations = useMemo(() => {
    if (!data) return [];
    return data.associations.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const enrichedStats = useMemo(() => {
    if (!data) return null;
    const totalAntennas = data.associations.reduce((acc, curr) => acc + curr._count.antennas, 0);
    const avgUsers = data.stats.totalAssociations > 0
      ? (data.stats.totalUsers / data.stats.totalAssociations).toFixed(1)
      : 0;
    return { totalAntennas, avgUsers, activeRate: '100%' };
  }, [data]);

  // Logique de Suspension / Activation (MAINTENANT CONNECTÉE)
  const handleToggleStatus = async () => {
    if (!selectedAsso) return;
    try {
      setIsProcessing(true);
      const newStatus = selectedAsso.isActive === false ? true : false;

      // 🔒 APPEL API RÉEL
      await api.updateAssociationStatusSystemAdmin(selectedAsso.id, newStatus);

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          associations: prev.associations.map(a =>
            a.id === selectedAsso.id ? { ...a, isActive: newStatus } : a
          )
        };
      });
      setSelectedAsso({ ...selectedAsso, isActive: newStatus });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      alert("Erreur lors de la modification du statut : " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Ouvre la modale de confirmation de suppression (ne supprime rien elle-même)
  const handleDelete = () => {
    if (!selectedAsso) return;
    setDeleteConfirmInput('');
    setShowDeleteConfirm(true);
  };

  // Exécute réellement la suppression, uniquement si le nom saisi correspond
  const executeDelete = async () => {
    if (!selectedAsso) return;
    if (deleteConfirmInput.trim() !== selectedAsso.name) return;

    try {
      setIsProcessing(true);

      // 🔒 APPEL API RÉEL
      await api.deleteAssociationSystemAdmin(selectedAsso.id);

      setShowDeleteConfirm(false);
      setSelectedAsso(null);
      // On rafraîchit les données pour avoir les bons chiffres en haut de page
      setLoading(true);
      fetchDashboardData();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      alert("Erreur lors de la suppression : " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC; 
      --surface: #FFFFFF;
      --surface-2: #F1F5F9; 
      --border: rgba(15, 23, 42, 0.08);
      --border-hover: rgba(139, 92, 246, 0.4);
      --accent: #8B5CF6;
      --accent-glow: rgba(139, 92, 246, 0.15);
      --accent-2: #C026D3;
      --text-1: #0F172A; 
      --text-2: #334155; 
      --text-3: #64748B; 
      --green: #059669;
      --green-bg: rgba(16, 185, 129, 0.15);
      --red: #DC2626;
      --red-bg: rgba(239, 68, 68, 0.12);
      
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03);
    }

    .gc-root {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      color: var(--text-1);
      padding: clamp(1rem, 4vw, 2.5rem);
      max-width: 1080px;
      margin: 0 auto;
    }

    /* ─── HERO ─── */
    .gc-hero {
      position: relative;
      text-align: center;
      padding: clamp(1.5rem, 5vw, 3rem) 1rem clamp(1rem, 4vw, 2rem);
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .gc-hero::before {
      content: '';
      position: absolute;
      top: -40px; left: 50%; transform: translateX(-50%);
      width: 600px; height: 300px;
      background: radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 60%);
      pointer-events: none;
    }
    .gc-eyebrow {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--accent); background: var(--surface);
      border: 1px solid var(--border-hover);
      padding: 0.4rem 1rem; border-radius: 100px;
      margin-bottom: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .gc-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
    .gc-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(1.75rem, 6vw, 3rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: var(--text-1);
      margin: 0 0 0.5rem;
    }
    .gc-title-accent {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .gc-subtitle { font-size: 1rem; color: var(--text-2); font-weight: 400; }

    /* ─── TOOLBAR ─── */
    .gc-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .gc-btn-deploy {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: white; border: none;
      height: 48px; padding: 0 1.5rem; border-radius: 14px;
      font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      box-shadow: 0 4px 12px rgba(139,92,246,0.25);
      transition: all 0.25s ease;
    }
    .gc-btn-deploy:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(139,92,246,0.3); }
    .gc-btn-deploy svg { flex-shrink: 0; }

    .gc-search-wrap {
      position: relative;
      flex: 1; min-width: 250px; max-width: 400px;
    }
    .gc-search-icon {
      position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
      color: var(--text-3); pointer-events: none;
    }
    .gc-search {
      width: 100%; height: 48px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; color: var(--text-1);
      font-family: 'Inter', sans-serif; font-size: 0.95rem;
      padding: 0 1rem 0 2.8rem;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
      box-shadow: var(--shadow-sm);
    }
    .gc-search::placeholder { color: var(--text-3); font-weight: 400; }
    .gc-search:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); }

    /* ─── STATS GRID ─── */
    .gc-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(0.5rem, 2vw, 1rem);
      margin-bottom: 3rem;
    }
    .gc-stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: clamp(0.75rem, 2.5vw, 1.5rem) clamp(0.5rem, 2vw, 1rem);
      text-align: center;
      position: relative; overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      animation: fadeUp 0.5s ease-out both;
    }
    .gc-stat:hover { border-color: var(--border-hover); transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .gc-stat-icon { font-size: clamp(1.1rem, 3vw, 1.4rem); margin-bottom: 0.5rem; line-height: 1; }
    .gc-stat-val {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(1.1rem, 3.5vw, 1.75rem);
      font-weight: 800; color: var(--text-1);
      letter-spacing: -0.02em; line-height: 1; margin-bottom: 0.4rem;
    }
    .gc-stat-lbl {
      font-size: clamp(0.6rem, 1.8vw, 0.75rem);
      font-weight: 600; color: var(--text-3);
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .gc-stat:nth-child(1) { animation-delay: 0.05s; }
    .gc-stat:nth-child(2) { animation-delay: 0.1s; }
    .gc-stat:nth-child(3) { animation-delay: 0.15s; }
    .gc-stat:nth-child(4) { animation-delay: 0.2s; }
    .gc-stat:nth-child(5) { animation-delay: 0.25s; }
    .gc-stat:nth-child(6) { animation-delay: 0.3s; }

    /* ─── ASSOCIATIONS ─── */
    .gc-section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.2rem; gap: 1rem;
    }
    .gc-section-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.9rem; font-weight: 700; color: var(--text-2);
      text-transform: uppercase; letter-spacing: 0.1em;
    }
    .gc-section-line { flex: 1; height: 1px; background: var(--border); }
    .gc-count-badge {
      font-size: 0.75rem; font-weight: 700; color: var(--text-1);
      background: var(--surface-2); border: 1px solid var(--border);
      padding: 0.25rem 0.75rem; border-radius: 100px;
    }

    .gc-asso-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .gc-asso-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: clamp(1rem, 3vw, 1.25rem) clamp(1rem, 3vw, 1.5rem);
      display: flex; align-items: center; gap: 1rem;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      animation: fadeUp 0.5s ease-out both;
    }
    .gc-asso-card:hover {
      border-color: var(--border-hover);
      transform: translateX(4px);
      box-shadow: var(--shadow-md);
    }

    .gc-asso-avatar {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 800;
      color: white; letter-spacing: -0.02em;
    }

    .gc-asso-body { flex: 1; min-width: 0; }
    .gc-asso-name {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1rem; font-weight: 700; color: var(--text-1);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 0.2rem;
    }
    .gc-asso-meta { font-size: 0.8rem; color: var(--text-3); display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .gc-asso-meta-chip { display: inline-flex; align-items: center; gap: 0.3rem; }

    .gc-asso-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }

    .gc-badge {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 0.3rem 0.75rem; border-radius: 100px;
    }
    .gc-badge-online { background: var(--green-bg); color: var(--green); border: 1px solid rgba(16,185,129,0.2); }
    .gc-badge-offline { background: var(--red-bg); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
    .gc-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .gc-badge-online .gc-badge-dot { animation: pulse 2s infinite; }

    .gc-asso-chevron { color: var(--text-3); transition: transform 0.2s, color 0.2s; }
    .gc-asso-card:hover .gc-asso-chevron { transform: translateX(3px); color: var(--accent); }

    .gc-empty {
      text-align: center; padding: 4rem 1rem; color: var(--text-3);
      font-size: 0.95rem; background: var(--surface); border: 1px dashed var(--border); border-radius: 16px;
    }
    .gc-empty-icon { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.7; }

    /* ─── LOADING ─── */
    .gc-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 6rem 1rem; gap: 1rem; color: var(--text-3);
    }
    .gc-spinner {
      width: 40px; height: 40px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--accent);
      animation: spin 0.8s linear infinite;
    }
    .gc-loading-text { font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }

    /* ─── ERROR ─── */
    .gc-error {
      background: var(--red-bg); border: 1px solid rgba(239,68,68,0.3);
      color: var(--red); padding: 1.25rem 1.5rem; border-radius: 14px;
      margin-bottom: 2rem; font-size: 0.95rem; font-weight: 500;
      display: flex; align-items: center; gap: 0.75rem;
    }

    /* ─── MODAL ─── */
    .gc-overlay {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px);
      display: flex; align-items: flex-end; justify-content: center;
      z-index: 9999; padding: 0;
      animation: fadeIn 0.25s ease;
    }
    @media (min-width: 640px) {
      .gc-overlay { align-items: center; padding: 1.5rem; }
    }

    .gc-modal {
      background: var(--surface); width: 100%; max-width: 500px;
      border-radius: 28px 28px 0 0;
      border: 1px solid var(--border);
      border-bottom: none;
      box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
      animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      max-height: 90vh; overflow-y: auto;
    }
    @media (min-width: 640px) {
      .gc-modal {
        border-radius: 24px;
        border-bottom: 1px solid var(--border);
        box-shadow: var(--shadow-lg);
        animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-height: 85vh;
      }
    }

    .gc-modal-banner {
      height: 120px; position: relative;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      overflow: hidden;
    }
    .gc-modal-banner::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at top right, rgba(255,255,255,0.2), transparent 60%);
    }
    .gc-modal-banner-text {
      position: absolute; bottom: 1.25rem; left: 1.5rem;
    }
    .gc-modal-avatar {
      width: 56px; height: 56px; border-radius: 16px;
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 800; color: var(--accent);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .gc-modal-close {
      position: absolute; top: 1rem; right: 1rem;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(0,0,0,0.15); backdrop-filter: blur(4px);
      border: none;
      color: white; cursor: pointer; font-size: 1rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .gc-modal-close:hover { background: rgba(0,0,0,0.25); }

    .gc-modal-body { padding: 1.5rem; }

    .gc-modal-name {
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.4rem; font-weight: 800;
      color: var(--text-1); margin-bottom: 0.5rem; letter-spacing: -0.02em;
    }

    .gc-modal-rows { margin: 1.5rem 0; background: var(--surface-2); border-radius: 16px; padding: 0.5rem 1.25rem; }
    .gc-detail-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
    }
    .gc-detail-row:last-child { border-bottom: none; }
    .gc-detail-label { font-size: 0.85rem; color: var(--text-3); font-weight: 500; }
    .gc-detail-value { font-size: 0.9rem; color: var(--text-1); font-weight: 600; font-family: 'Inter', sans-serif; }
    .gc-detail-code {
      font-family: monospace; font-size: 0.85rem; font-weight: 600;
      background: var(--surface); padding: 0.3rem 0.6rem;
      border-radius: 8px; color: var(--accent); border: 1px solid var(--border);
    }

    .gc-modal-footer { padding: 0 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    
    .gc-btn-manage {
      width: 100%; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border: none; color: white;
      font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      box-shadow: 0 8px 20px var(--accent-glow);
      transition: all 0.2s;
    }
    .gc-btn-manage:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(139,92,246,0.3); }
    
    .gc-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    
    .gc-btn-warning {
      height: 48px; border-radius: 12px;
      background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
      color: #D97706; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.2s;
    }
    .gc-btn-warning:hover:not(:disabled) { background: #F59E0B; color: white; }
    .gc-btn-warning:disabled { opacity: 0.5; cursor: not-allowed; }

    .gc-btn-success {
      height: 48px; border-radius: 12px;
      background: var(--green-bg); border: 1px solid rgba(16,185,129,0.3);
      color: var(--green); font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.2s;
    }
    .gc-btn-success:hover:not(:disabled) { background: var(--green); color: white; }
    .gc-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }

    .gc-btn-danger {
      height: 48px; border-radius: 12px;
      background: var(--red-bg); border: 1px solid rgba(239,68,68,0.3);
      color: var(--red); font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: all 0.2s;
    }
    .gc-btn-danger:hover:not(:disabled) { background: var(--red); color: white; }
    .gc-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

    .gc-btn-close-modal {
      width: 100%; height: 48px; border-radius: 14px;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--text-2); font-family: 'Inter', sans-serif;
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .gc-btn-close-modal:hover { background: var(--surface); color: var(--text-1); border-color: var(--text-3); }

    /* ─── DANGER MODAL (confirmation de suppression) ─── */
    .gc-danger-overlay {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; padding: 1.5rem;
      animation: fadeIn 0.2s ease;
    }
    .gc-danger-modal {
      background: var(--surface); width: 100%; max-width: 440px;
      border-radius: 20px; border: 1px solid rgba(239,68,68,0.3);
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
      padding: 1.75rem;
      animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .gc-danger-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: var(--red-bg); color: var(--red);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1rem;
    }
    .gc-danger-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 1.15rem; font-weight: 800; color: var(--text-1);
      margin-bottom: 0.5rem;
    }
    .gc-danger-text {
      font-size: 0.88rem; color: var(--text-2); line-height: 1.5; margin-bottom: 1.25rem;
    }
    .gc-danger-text b { color: var(--text-1); }
    .gc-danger-input {
      width: 100%; height: 46px; border-radius: 12px; box-sizing: border-box;
      border: 1.5px solid var(--border); padding: 0 1rem;
      font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600;
      outline: none; transition: border-color 0.2s;
      margin-bottom: 1.25rem;
    }
    .gc-danger-input:focus { border-color: var(--red); box-shadow: 0 0 0 4px rgba(239,68,68,0.1); }
    .gc-danger-actions { display: flex; gap: 0.75rem; }
    .gc-danger-actions button {
      flex: 1; height: 46px; border-radius: 12px; font-weight: 700; font-size: 0.88rem;
      cursor: pointer; border: none; transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .gc-danger-cancel { background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border) !important; }
    .gc-danger-cancel:hover { background: var(--surface); }
    .gc-danger-confirm { background: var(--red); color: white; }
    .gc-danger-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
    .gc-danger-confirm:not(:disabled):hover { filter: brightness(0.9); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(100%); } to { transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }

    @media (max-width: 480px) {
      .gc-asso-avatar { width: 40px; height: 40px; border-radius: 10px; font-size: 0.9rem; }
      .gc-asso-card { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .gc-asso-right { width: 100%; flex-direction: row; justify-content: space-between; align-items: center; }
      .gc-asso-chevron { display: none; }
      .gc-actions-grid { grid-template-columns: 1fr; }
    }
  `;

  const getInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  return (
    <AppShell title="Console Grand Chef">
      <style>{CSS}</style>

      <div className="gc-root">
        {/* ── HERO ── */}
        <header className="gc-hero">
          <div className="gc-eyebrow">
            <span className="gc-eyebrow-dot" />
            Système opérationnel
          </div>
          <h1 className="gc-title">
            Console <span className="gc-title-accent">Grand Chef</span>
          </h1>
          <p className="gc-subtitle">Supervision de la plateforme communautaire</p>
        </header>

        {/* ── ERROR ── */}
        {error && (
          <div className="gc-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            {error}
          </div>
        )}

        {/* ── TOOLBAR ── */}
        <div className="gc-toolbar">
          <button className="gc-btn-deploy" onClick={() => router.push('/system-admin/associations/new')}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Déployer une instance
          </button>

          <div className="gc-search-wrap">
            <svg className="gc-search-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="gc-search"
              placeholder="Rechercher une association..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="gc-loading">
            <div className="gc-spinner" />
            <span className="gc-loading-text">Initialisation...</span>
          </div>
        ) : data ? (
          <>
            {/* ── STATS ── */}
            <div className="gc-stats-grid">
              {[
                { icon: '🏢', val: data.stats.totalAssociations, lbl: 'Instances' },
                { icon: '👥', val: data.stats.totalUsers, lbl: 'Membres' },
                { icon: '📡', val: enrichedStats?.totalAntennas, lbl: 'Antennes' },
                { icon: '📊', val: enrichedStats?.avgUsers, lbl: 'Moyenne' },
                { icon: '⚡', val: enrichedStats?.activeRate, lbl: 'Status' },
                { icon: '🛡️', val: 'SaaS', lbl: 'Mode' },
              ].map(({ icon, val, lbl }) => (
                <div key={lbl} className="gc-stat">
                  <div className="gc-stat-icon">{icon}</div>
                  <div className="gc-stat-val">{val}</div>
                  <div className="gc-stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>

            {/* ── ASSOCIATIONS ── */}
            <div className="gc-section-head">
              <span className="gc-section-title">Parc des Associations</span>
              <span className="gc-section-line" />
              <span className="gc-count-badge">{filteredAssociations.length}</span>
            </div>

            <div className="gc-asso-list">
              {filteredAssociations.length > 0 ? filteredAssociations.map((asso, i) => (
                <div
                  key={asso.id}
                  className="gc-asso-card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => setSelectedAsso(asso)}
                >
                  <div className="gc-asso-avatar">{getInitials(asso.name)}</div>

                  <div className="gc-asso-body">
                    <div className="gc-asso-name">{asso.name}</div>
                    <div className="gc-asso-meta">
                      <span className="gc-asso-meta-chip">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="3"/>
                        </svg>
                        {asso.code}
                      </span>
                      <span>·</span>
                      <span className="gc-asso-meta-chip">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                        {asso._count.users} membres
                      </span>
                      {asso._count.antennas > 0 && (
                        <>
                          <span>·</span>
                          <span className="gc-asso-meta-chip">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
                            </svg>
                            {asso._count.antennas} antennes
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="gc-asso-right">
                    <span className={`gc-badge ${asso.isActive !== false ? 'gc-badge-online' : 'gc-badge-offline'}`}>
                      <span className="gc-badge-dot" />
                      {asso.isActive !== false ? 'En ligne' : 'Suspendu'}
                    </span>
                  </div>

                  <svg className="gc-asso-chevron" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              )) : (
                <div className="gc-empty">
                  <div className="gc-empty-icon">🔍</div>
                  <p>Aucun résultat pour &quot;{search}&quot;</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* ── MODAL ── */}
      {selectedAsso && (
        <div className="gc-overlay" onClick={() => setSelectedAsso(null)}>
          <div className="gc-modal" onClick={e => e.stopPropagation()}>

            <div className="gc-modal-banner">
              <button className="gc-modal-close" onClick={() => setSelectedAsso(null)}>✕</button>
              <div className="gc-modal-banner-text">
                <div className="gc-modal-avatar">{getInitials(selectedAsso.name)}</div>
              </div>
            </div>

            <div className="gc-modal-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div className="gc-modal-name">{selectedAsso.name}</div>
                <span className={`gc-badge ${selectedAsso.isActive !== false ? 'gc-badge-online' : 'gc-badge-offline'}`} style={{ flexShrink: 0, marginTop: '0.4rem' }}>
                  <span className="gc-badge-dot" />
                  {selectedAsso.isActive !== false ? 'Active' : 'Suspendue'}
                </span>
              </div>

              <div className="gc-modal-rows">
                <div className="gc-detail-row">
                  <span className="gc-detail-label">Code identifiant</span>
                  <span className="gc-detail-code">{selectedAsso.code}</span>
                </div>
                <div className="gc-detail-row">
                  <span className="gc-detail-label">Sous-domaine</span>
                  <span className="gc-detail-value">{selectedAsso.domainName || 'standard.lcd.com'}</span>
                </div>
                <div className="gc-detail-row">
                  <span className="gc-detail-label">Membres inscrits</span>
                  <span className="gc-detail-value">{selectedAsso._count.users}</span>
                </div>
                <div className="gc-detail-row">
                  <span className="gc-detail-label">Antennes</span>
                  <span className="gc-detail-value">{selectedAsso._count.antennas}</span>
                </div>
                <div className="gc-detail-row">
                  <span className="gc-detail-label">Date de déploiement</span>
                  <span className="gc-detail-value">{formatDate(selectedAsso.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="gc-modal-footer">
              <button
                className="gc-btn-manage"
                onClick={() => router.push(`/system-admin/associations/${selectedAsso.id}`)}
                disabled={isProcessing}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Modifier et configurer l&apos;instance
              </button>

              <div className="gc-actions-grid">
                <button
                  className={selectedAsso.isActive !== false ? "gc-btn-warning" : "gc-btn-success"}
                  onClick={handleToggleStatus}
                  disabled={isProcessing}
                >
                  {selectedAsso.isActive !== false ? (
                    <>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Suspendre
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Réactiver
                    </>
                  )}
                </button>

                <button
                  className="gc-btn-danger"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              </div>

              <button className="gc-btn-close-modal" onClick={() => setSelectedAsso(null)} disabled={isProcessing}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DANGER MODAL : confirmation de suppression avec saisie du nom exact ── */}
      {showDeleteConfirm && selectedAsso && (
        <div className="gc-danger-overlay" onClick={() => !isProcessing && setShowDeleteConfirm(false)}>
          <div className="gc-danger-modal" onClick={e => e.stopPropagation()}>
            <div className="gc-danger-icon">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div className="gc-danger-title">Supprimer définitivement cette instance ?</div>
            <p className="gc-danger-text">
              Cette action détruira toutes les antennes, membres, transactions et fichiers liés à{' '}
              <b>{selectedAsso.name}</b>. C&apos;est irréversible.
              <br /><br />
              Pour confirmer, tapez le nom exact de l&apos;association : <b>{selectedAsso.name}</b>
            </p>
            <input
              className="gc-danger-input"
              value={deleteConfirmInput}
              onChange={e => setDeleteConfirmInput(e.target.value)}
              placeholder={selectedAsso.name}
              autoFocus
              disabled={isProcessing}
            />
            <div className="gc-danger-actions">
              <button
                className="gc-danger-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isProcessing}
              >
                Annuler
              </button>
              <button
                className="gc-danger-confirm"
                onClick={executeDelete}
                disabled={isProcessing || deleteConfirmInput.trim() !== selectedAsso.name}
              >
                {isProcessing ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}