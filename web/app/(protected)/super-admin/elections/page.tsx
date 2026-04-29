// web/app/(protected)/super-admin/elections/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Election, ElectionPosition, ElectionCandidate } from '../../../../types/election';
import type { UserSummary } from '../../../../types/user';
import { LiveResults } from '../../../../components/elections/LiveResults';
import { formatDate } from '../../../../lib/format';

export default function SuperAdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [selectedElectionTitle, setSelectedElectionTitle] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', startsAt: '', endsAt: '' });

  const [confirmStatusData, setConfirmStatusData] = useState<{ id: string; newStatus: 'OPEN' | 'CLOSED'; title: string } | null>(null);
  const [confirmDeleteData, setConfirmDeleteData] = useState<Election | null>(null);
  const [deleteInput, setDeleteInput] = useState('');

  const [confirmDeletePosition, setConfirmDeletePosition] = useState<ElectionPosition | null>(null);
  const [confirmDeleteCandidate, setConfirmDeleteCandidate] = useState<ElectionCandidate | null>(null);

  const [manageElection, setManageElection] = useState<Election | null>(null);
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [candidateForm, setCandidateForm] = useState<{ positionId: string; userId: string; bio: string } | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');

  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionTitle, setEditingPositionTitle] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadElections = useCallback(async () => {
    try {
      const data = await api.listElectionsSuperAdmin();
      setElections(data);
      setManageElection(prev => {
        if (!prev) return null;
        return data.find(e => e.id === prev.id) || null;
      });
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { void loadElections(); }, [loadElections]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    setBusy(true);
    try {
      await api.createElection({
        title: formData.title,
        description: formData.description || undefined,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
        endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
      });
      setShowModal(false);
      setFormData({ title: '', description: '', startsAt: '', endsAt: '' });
      showToast("Scrutin créé avec succès !", "success");
      await loadElections();
    } catch (err: unknown) { 
      showToast(err instanceof Error ? err.message : "Erreur de création.", "error");
    } finally { setBusy(false); }
  };

  const executeStatusChange = async () => {
    if (!confirmStatusData) return;
    setBusy(true);
    try {
      await api.updateElectionStatus(confirmStatusData.id, confirmStatusData.newStatus);
      showToast(`Statut mis à jour.`, "success");
      setConfirmStatusData(null);
      await loadElections();
    } catch (err: unknown) { 
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const handleDeleteElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDeleteData || deleteInput !== confirmDeleteData.title) return;
    setBusy(true);
    try {
      await api.deleteElectionSuperAdmin(confirmDeleteData.id);
      showToast("Scrutin supprimé définitivement.", "success");
      setConfirmDeleteData(null);
      setDeleteInput('');
      if (selectedElectionId === confirmDeleteData.id) setSelectedElectionId(null);
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const openManageModal = async (election: Election) => {
    setManageElection(election);
    setCandidateForm(null);
    setCandidateSearch('');
    setEditingPositionId(null);
    if (members.length === 0) {
      try {
        const res = await api.listMembers({ pageSize: 1000, status: 'ACTIVE' });
        setMembers(res.items);
      } catch (e) { console.error(e); }
    }
  };

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim() || !manageElection) return;
    setBusy(true);
    try {
      await api.addElectionPosition(manageElection.id, { title: newPositionTitle, order: manageElection.positions.length + 1 });
      setNewPositionTitle('');
      showToast("Poste ajouté !", "success");
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const handleUpdatePosition = async (positionId: string) => {
    if (!editingPositionTitle.trim()) return;
    setBusy(true);
    try {
      await api.updateElectionPosition(positionId, { title: editingPositionTitle });
      setEditingPositionId(null);
      showToast("Poste mis à jour !", "success");
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const executeDeletePosition = async () => {
    if (!confirmDeletePosition) return;
    setBusy(true);
    try {
      await api.deleteElectionPosition(confirmDeletePosition.id);
      showToast("Poste supprimé.", "success");
      setConfirmDeletePosition(null);
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm || !candidateForm.userId) return;
    setBusy(true);
    try {
      await api.addElectionCandidate(candidateForm.positionId, { userId: candidateForm.userId, bio: candidateForm.bio || undefined });
      setCandidateForm(null);
      setCandidateSearch('');
      showToast("Candidat inscrit !", "success");
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const executeDeleteCandidate = async () => {
    if (!confirmDeleteCandidate) return;
    setBusy(true);
    try {
      await api.deleteElectionCandidate(confirmDeleteCandidate.id);
      showToast("Candidat retiré.", "success");
      setConfirmDeleteCandidate(null);
      await loadElections();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur.", "error");
    } finally { setBusy(false); }
  };

  const filteredMembers = candidateSearch.trim() === '' 
    ? [] 
    : members.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(candidateSearch.toLowerCase())).slice(0, 6);

  const exportExcel = async () => {
    if (!selectedElectionId) return;
    try {
      const data = await api.getElectionLiveResults(selectedElectionId);
      let csv = "Poste;Candidat;Email;Commune d'origine;Votes;Pourcentage\n";
      data.forEach(pos => {
        pos.results.forEach(cand => {
          csv += `"${pos.title}";"${cand.name}";"${cand.email || ''}";"${cand.originSubPrefecture || ''}";${cand.votes};${cand.percentage.toFixed(2)}%\n`;
        });
      });
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Resultats_${selectedElectionTitle.replace(/ /g, '_')}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast("Export Excel généré.", "success");
    } catch { showToast("Erreur export.", "error"); }
  };

  const exportPDF = () => window.print();

  return (
    <AppShell title="Gestion des Élections">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        /* ── VARIABLES ── */
        :root {
          --ink: #0A0F1E;
          --ink-2: #1E293B;
          --ink-3: #334155;
          --slate: #64748B;
          --muted: #94A3B8;
          --border: #E2E8F0;
          --surface: #F8FAFC;
          --white: #FFFFFF;
          --blue: #2563EB;
          --blue-dark: #1D4ED8;
          --blue-light: #EFF6FF;
          --blue-mid: #BFDBFE;
          --green: #059669;
          --green-light: #ECFDF5;
          --red: #DC2626;
          --red-light: #FEF2F2;
          --amber: #D97706;
          --amber-light: #FFFBEB;
          --r-card: 20px;
          --r-btn: 12px;
          --r-input: 12px;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04);
          --shadow-lg: 0 10px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
          --shadow-xl: 0 24px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── PAGE ── */
        .el-wrap {
          padding: clamp(1.25rem, 3vw, 2.25rem);
          max-width: 1280px;
          margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── TOAST ── */
        .el-toast {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 9999;
          padding: 0.875rem 1.25rem;
          border-radius: 16px;
          background: var(--white);
          box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.04);
          display: flex; align-items: center; gap: 0.75rem;
          font-size: 0.875rem; font-weight: 600; color: var(--ink-2);
          animation: toastIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
          max-width: 360px;
        }        .el-toast-icon {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .el-toast.success .el-toast-icon { background: var(--green-light); color: var(--green); }
        .el-toast.error .el-toast-icon { background: var(--red-light); color: var(--red); }

        /* ── HEADER ── */
        .el-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
        }
        .el-header-left h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.75rem, 3vw, 2.25rem);
          font-weight: 700; color: var(--ink);
          letter-spacing: -0.03em; line-height: 1;
        }
        .el-header-left p {
          font-size: 0.85rem; color: var(--slate); margin-top: 0.35rem; font-weight: 500;
        }

        /* ── BOUTON CRÉER ── */
        .btn-create {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1.375rem;
          background: var(--ink);
          color: var(--white);
          border: none; border-radius: var(--r-btn);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 4px 12px rgba(10,15,30,0.2);
          white-space: nowrap;
        }
        .btn-create:hover { background: var(--blue); box-shadow: 0 6px 20px rgba(37,99,235,0.3); transform: translateY(-1px); }
        .btn-create:active { transform: translateY(0); }
        .btn-create:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-create-icon {
          width: 22px; height: 22px; background: rgba(255,255,255,0.15);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
        }

        /* ── GRILLE PRINCIPALE ── */
        .el-layout { display: grid; grid-template-columns: 1fr 1.1fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 960px) { .el-layout { grid-template-columns: 1fr; } }

        /* ── LISTE SCRUTINS ── */
        .el-list { display: flex; flex-direction: column; gap: 1rem; }

        /* ── CARTE SCRUTIN ── */
        .el-card {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--r-card);
          padding: 1.5rem;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          box-shadow: var(--shadow-sm);
          cursor: default;
        }
        .el-card:hover { box-shadow: var(--shadow-md); border-color: #CBD5E1; transform: translateY(-1px); }
        .el-card.selected { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.1), var(--shadow-md); }

        .el-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
        .el-card-title {
          font-size: 1.0625rem; font-weight: 800; color: var(--ink-2);
          line-height: 1.3; letter-spacing: -0.01em;
        }
        .el-card-desc { font-size: 0.8375rem; color: var(--slate); line-height: 1.55; margin-bottom: 1rem; }

        /* ── BADGE STATUT ── */
        .el-status {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.3rem 0.75rem; border-radius: 99px;
          font-size: 0.6875rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.06em;
          white-space: nowrap; flex-shrink: 0;
        }
        .el-status.DRAFT { background: var(--surface); color: var(--slate); border: 1px solid var(--border); }
        .el-status.OPEN { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
        .el-status.CLOSED { background: var(--red-light); color: var(--red); border: 1px solid #FECACA; }
        .el-status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }

        /* ── DATES ── */
        .el-dates {
          display: flex; gap: 1rem; flex-wrap: wrap;
          background: var(--surface); border-radius: 10px;
          padding: 0.75rem 1rem; margin-bottom: 1.25rem;
          border: 1px solid var(--border);
        }
        .el-date-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--slate); font-weight: 500; }
        .el-date-item strong { color: var(--ink-3); font-weight: 700; font-family: 'DM Mono', monospace; font-size: 0.75rem; }

        /* ── ACTIONS CARTE ── */
        .el-card-actions {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
          padding-top: 1.25rem; border-top: 1px solid var(--border); margin-top: 0.25rem;
        }
        .el-card-actions .btn-full { grid-column: 1 / -1; }

        .btn-action {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
          padding: 0.7rem 1rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8125rem; font-weight: 700;
          cursor: pointer; transition: all 0.18s ease;
          border: 1.5px solid var(--border);
          background: var(--white); color: var(--ink-3);
        }
        .btn-action:hover:not(:disabled) { background: var(--surface); border-color: #CBD5E1; color: var(--ink); }
        .btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-action.btn-results { background: var(--blue-light); color: var(--blue); border-color: var(--blue-mid); }
        .btn-action.btn-results:hover:not(:disabled) { background: #DBEAFE; border-color: #93C5FD; }

        .btn-action.btn-config { background: var(--ink); color: var(--white); border-color: var(--ink); }
        .btn-action.btn-config:hover:not(:disabled) { background: var(--ink-2); }

        .btn-action.btn-launch { background: linear-gradient(135deg, #059669, #10B981); color: var(--white); border-color: transparent; box-shadow: 0 4px 12px rgba(5,150,105,0.25); }
        .btn-action.btn-launch:hover:not(:disabled) { box-shadow: 0 6px 16px rgba(5,150,105,0.35); transform: translateY(-1px); }

        .btn-action.btn-close { background: var(--red-light); color: var(--red); border-color: #FECACA; }
        .btn-action.btn-close:hover:not(:disabled) { background: #FEE2E2; }

        .btn-action.btn-delete-icon {
          padding: 0.7rem; border-color: var(--border);
          background: var(--white); color: var(--muted);
        }
        .btn-action.btn-delete-icon:hover:not(:disabled) { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        /* ── PANNEAU RÉSULTATS ── */
        .el-results-panel {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--r-card);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          position: sticky; top: 1rem;
        }
        .el-results-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
        }
        .el-results-title { font-size: 0.8125rem; font-weight: 800; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── BOUTONS EXPORT ── */
        .export-btns { display: flex; gap: 0.625rem; }

        .btn-export {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease;
          border: none;
        }
        .btn-export-excel {
          background: #16A34A; color: var(--white);
          box-shadow: 0 3px 10px rgba(22,163,74,0.25);
        }
        .btn-export-excel:hover { background: #15803D; box-shadow: 0 4px 14px rgba(22,163,74,0.35); transform: translateY(-1px); }

        .btn-export-pdf {
          background: #DC2626; color: var(--white);
          box-shadow: 0 3px 10px rgba(220,38,38,0.2);
        }
        .btn-export-pdf:hover { background: #B91C1C; box-shadow: 0 4px 14px rgba(220,38,38,0.3); transform: translateY(-1px); }

        .btn-export svg { flex-shrink: 0; }

        .el-results-body { padding: 1.25rem 1.5rem; }

        .el-results-empty {
          padding: 5rem 2rem; text-align: center;
          color: var(--muted); font-weight: 500;
        }
        .el-results-empty-icon {
          width: 52px; height: 52px; margin: 0 auto 1rem;
          background: var(--surface); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--muted);
        }

        /* ── MODALE BASE ── */
        .m-overlay {
          position: fixed; inset: 0;
          background: rgba(10,15,30,0.5);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease forwards;
        }
        .m-box {
          background: var(--white);
          border-radius: 24px;
          width: 100%; max-width: 520px;
          max-height: 92vh; overflow-y: auto;
          box-shadow: var(--shadow-xl), 0 0 0 1px rgba(0,0,0,0.04);
          animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
          scrollbar-width: none;
        }
        .m-box::-webkit-scrollbar { display: none; }
        .m-box.wide { max-width: 680px; }
        .m-box.narrow { max-width: 420px; }

        .m-head {
          padding: 1.75rem 1.75rem 0;
          position: sticky; top: 0; background: var(--white); z-index: 1;
          border-bottom: 1px solid var(--border); padding-bottom: 1.25rem;
        }
        .m-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .m-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem; font-weight: 700; color: var(--ink);
          letter-spacing: -0.025em; line-height: 1.1;
        }
        .m-subtitle { font-size: 0.85rem; color: var(--slate); margin-top: 0.3rem; font-weight: 500; line-height: 1.45; }
        .m-close {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--surface); border: 1px solid var(--border);
          color: var(--slate); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.18s;
        }
        .m-close:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        .m-body { padding: 1.5rem 1.75rem 1.75rem; }

        /* ── CHAMPS FORMULAIRE ── */
        .f-group { margin-bottom: 1.25rem; }
        .f-label {
          display: block; font-size: 0.7rem; font-weight: 800;
          color: var(--slate); text-transform: uppercase;
          letter-spacing: 0.07em; margin-bottom: 0.5rem;
        }
        .f-input, .f-textarea {
          width: 100%; padding: 0.875rem 1rem;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--r-input);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; color: var(--ink-2); font-weight: 500;
          transition: all 0.18s; outline: none;
        }
        .f-input:focus, .f-textarea:focus {
          background: var(--white);
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .f-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
        .f-hint { font-size: 0.75rem; color: var(--muted); margin-top: 0.35rem; }

        .f-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
        @media (max-width: 480px) { .f-date-row { grid-template-columns: 1fr; } }

        /* ── BOUTONS MODALE ── */
        .m-actions { display: flex; gap: 0.75rem; margin-top: 1.75rem; }
        .btn-cancel {
          flex: 1; padding: 0.875rem;
          background: var(--white); border: 1.5px solid var(--border);
          border-radius: var(--r-btn); color: var(--slate);
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .btn-cancel:hover { background: var(--surface); border-color: #CBD5E1; color: var(--ink); }        .btn-submit {
          flex: 1.5; padding: 0.875rem;
          background: var(--ink); border: none;
          border-radius: var(--r-btn); color: var(--white);
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 800;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(10,15,30,0.15);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) { background: var(--blue); box-shadow: 0 6px 18px rgba(37,99,235,0.25); transform: translateY(-1px); }
        .btn-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-submit.danger { background: var(--red); }
        .btn-submit.danger:hover:not(:disabled) { background: #B91C1C; box-shadow: 0 6px 18px rgba(220,38,38,0.3); }

        /* ── SECTION POSTE (MODAL GESTION) ── */
        .pos-section { margin-bottom: 1.75rem; }
        .pos-add-row {
          display: flex; gap: 0.625rem; margin-bottom: 1.75rem;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 0.875rem;
        }
        .pos-add-row .f-input { background: var(--white); margin: 0; }
        .btn-add-pos {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.75rem 1.125rem;
          background: var(--ink); color: var(--white); border: none;
          border-radius: 10px; font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 800; cursor: pointer;
          white-space: nowrap; transition: all 0.18s;
        }
        .btn-add-pos:hover:not(:disabled) { background: var(--blue); }
        .btn-add-pos:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ⚡ CORRECTION: On enlève overflow: hidden; pour laisser le dropdown s'afficher et on gère le z-index dynamique */
        .pos-block {
          background: var(--white); border: 1.5px solid var(--border);
          border-radius: 16px; margin-bottom: 1rem;
          position: relative; z-index: 1;
          transition: z-index 0s; 
        }
        .pos-block:focus-within {
          z-index: 50; /* Permet au menu déroulant de toujours passer au-dessus des autres cartes */
        }
        
        .pos-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.25rem;
          background: var(--surface); border-bottom: 1px solid var(--border);
          border-radius: 14.5px 14.5px 0 0; /* ⚡ CORRECTION: Pour compenser la suppression du hidden, on arrondit directement le header */
          gap: 0.75rem;
        }
        .pos-title { font-size: 0.9375rem; font-weight: 800; color: var(--ink-2); }
        .pos-header-actions { display: flex; gap: 0.375rem; align-items: center; }

        .btn-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border); background: var(--white);
          color: var(--muted); cursor: pointer; transition: all 0.18s;
          flex-shrink: 0;
        }
        .btn-icon:hover { background: var(--surface); color: var(--ink-3); }
        .btn-icon.danger:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        .btn-add-cand {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.45rem 0.875rem;
          background: var(--blue-light); color: var(--blue);
          border: 1px solid var(--blue-mid); border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 0.775rem; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .btn-add-cand:hover { background: #DBEAFE; }

        .pos-body { padding: 1.25rem; }

        /* ── GRILLE CANDIDATS 3 colonnes ── */
        .cand-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 600px) { .cand-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; } }
        @media (max-width: 380px) { .cand-grid { grid-template-columns: repeat(2, 1fr); } }

        .cand-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 0.875rem 0.75rem;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 0.5rem; position: relative;
          transition: all 0.18s;
        }
        .cand-card:hover { box-shadow: var(--shadow-sm); border-color: #CBD5E1; }
        .cand-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, var(--blue), #60A5FA);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 800; color: var(--white);
          flex-shrink: 0;
        }
        .cand-name { font-size: 0.75rem; font-weight: 700; color: var(--ink-3); line-height: 1.3; }
        .btn-remove-cand {
          position: absolute; top: 0.5rem; right: 0.5rem;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--white); border: 1px solid var(--border);
          color: var(--muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s; opacity: 0;
        }
        .cand-card:hover .btn-remove-cand { opacity: 1; }
        .btn-remove-cand:hover { background: var(--red-light); color: var(--red); border-color: #FECACA; }

        /* ── AJOUT CANDIDAT ── */
        .add-cand-zone {
          background: var(--surface); border: 1.5px dashed #CBD5E1;
          border-radius: 12px; padding: 1.25rem; position: relative;
        }
        
        /* ⚡ CORRECTION: Ajout d'un max-height et overflow-y pour rendre le dropdown scrollable s'il est long */
        .search-dropdown {
          position: absolute; top: 100%; left: 0; right: 0;
          background: var(--white); border: 1.5px solid var(--border);
          border-radius: 12px; box-shadow: var(--shadow-lg);
          max-height: 220px; overflow-y: auto; z-index: 50; margin-top: 0.375rem;
        }
        
        .search-item {
          padding: 0.75rem 1rem; cursor: pointer;
          font-size: 0.85rem; font-weight: 600; color: var(--ink-3);
          transition: background 0.15s; border-bottom: 1px solid var(--surface);
          display: flex; align-items: center; gap: 0.5rem;
        }
        .search-item:last-child { border-bottom: none; }
        .search-item:hover { background: var(--blue-light); color: var(--blue); }
        .search-item-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--border); display: flex; align-items: center;
          justify-content: center; font-size: 0.7rem; font-weight: 800; color: var(--slate);
          flex-shrink: 0;
        }
        .selected-member {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--blue-light); border: 1px solid var(--blue-mid);
          border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 0.875rem;
        }
        .selected-member-info { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: var(--blue); }
        .btn-change { font-size: 0.75rem; font-weight: 700; color: var(--slate); background: none; border: none; cursor: pointer; text-decoration: underline; }
        .btn-change:hover { color: var(--ink); }

        /* ── CONFIRMATION MODALE ── */
        .confirm-icon {
          width: 56px; height: 56px; border-radius: 50%;
          margin: 0 auto 1.25rem;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
        }
        .confirm-icon.danger { background: var(--red-light); }
        .confirm-icon.warning { background: var(--amber-light); }

        .m-center { text-align: center; }
        .m-center .m-title { font-size: 1.375rem; margin-bottom: 0.5rem; }
        .m-center .m-subtitle { font-size: 0.875rem; }

        /* ── ÉDITION POSITION ── */
        .pos-edit-row { display: flex; gap: 0.5rem; align-items: center; flex: 1; }
        .pos-edit-row .f-input { padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .btn-confirm-edit {
          padding: 0.5rem 0.875rem; background: #059669; color: white;
          border: none; border-radius: 8px; font-weight: 700; font-size: 0.8rem;
          cursor: pointer; white-space: nowrap;
        }
        .btn-cancel-edit {
          padding: 0.5rem 0.875rem; background: var(--surface);
          border: 1px solid var(--border); border-radius: 8px;
          font-weight: 700; font-size: 0.8rem; color: var(--slate); cursor: pointer;
        }

        /* ── ÉTAT VIDE ── */
        .empty-state {
          padding: 4rem 2rem; text-align: center;
          border: 2px dashed var(--border); border-radius: var(--r-card);
          color: var(--muted);
        }
        .empty-state-icon {
          width: 56px; height: 56px; margin: 0 auto 1rem;
          background: var(--surface); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .empty-state p { font-weight: 600; font-size: 0.9375rem; color: var(--slate); }
        .empty-state span { font-size: 0.8375rem; display: block; margin-top: 0.35rem; }

        /* ── ANIMATIONS ── */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

        /* ── SPINNER ── */
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
          border-radius: 50%; animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── PRINT ── */
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div className={`el-toast ${toast.type}`}>
          <div className="el-toast-icon">
            {toast.type === 'success' ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          {toast.message}
        </div>
      )}

      <div className="el-wrap">
        {/* HEADER */}
        <div className="el-header">
          <div className="el-header-left">
            <h1>Gestion des Élections</h1>
            <p>{elections.length} scrutin{elections.length !== 1 ? 's' : ''} enregistré{elections.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn-create" onClick={() => setShowModal(true)}>
            <div className="btn-create-icon">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            Créer un scrutin
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--muted)', fontWeight: 600 }}>Chargement…</div>
        ) : (
          <div className="el-layout">
            {/* LISTE */}
            <div className="el-list">
              {elections.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <p>Aucun scrutin pour le moment</p>
                  <span>Créez votre premier scrutin en haut à droite</span>
                </div>
              ) : elections.map(election => (
                <div key={election.id} className={`el-card ${selectedElectionId === election.id ? 'selected' : ''}`}>
                  <div className="el-card-top">
                    <div>
                      <span className={`el-status ${election.status}`}>
                        {election.status === 'OPEN' && <span className="el-status-dot" />}
                        {election.status === 'OPEN' ? 'En cours' : election.status === 'DRAFT' ? 'Brouillon' : 'Clôturée'}
                      </span>
                    </div>
                  </div>
                  <h2 className="el-card-title">{election.title}</h2>
                  <p className="el-card-desc">{election.description || 'Aucune description fournie.'}</p>
                  {(election.startsAt || election.endsAt) && (
                    <div className="el-dates">
                      {election.startsAt && (
                        <div className="el-date-item">
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Début&nbsp;<strong>{formatDate(election.startsAt)}</strong>
                        </div>
                      )}
                      {election.endsAt && (
                        <div className="el-date-item">
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                          Fin&nbsp;<strong>{formatDate(election.endsAt)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="el-card-actions">
                    <button className="btn-action btn-results" onClick={() => { setSelectedElectionId(election.id); setSelectedElectionTitle(election.title); }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      Résultats
                    </button>

                    <button className="btn-action btn-config" onClick={() => void openManageModal(election)}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                      Configurer
                    </button>

                    {election.status === 'DRAFT' && (
                      <button className="btn-action btn-launch btn-full" onClick={() => setConfirmStatusData({ id: election.id, newStatus: 'OPEN', title: election.title })}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Lancer le vote
                      </button>
                    )}
                    {election.status === 'OPEN' && (
                      <button className="btn-action btn-close btn-full" onClick={() => setConfirmStatusData({ id: election.id, newStatus: 'CLOSED', title: election.title })}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                        Clôturer le scrutin
                      </button>
                    )}

                    <button className="btn-action btn-delete-icon" title="Supprimer" onClick={() => setConfirmDeleteData(election)}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* RÉSULTATS */}
            <div>
              {selectedElectionId ? (
                <div className="el-results-panel printable-area">
                  <div className="el-results-header">
                    <span className="el-results-title">Résultats en direct</span>
                    <div className="export-btns">
                      <button className="btn-export btn-export-excel" onClick={() => void exportExcel()}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Excel
                      </button>
                      <button className="btn-export btn-export-pdf" onClick={exportPDF}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        PDF
                      </button>
                    </div>
                  </div>
                  <div className="el-results-body">
                    <LiveResults electionId={selectedElectionId} />
                  </div>
                </div>
              ) : (
                <div className="el-results-panel">
                  <div className="el-results-empty">
                    <div className="el-results-empty-icon">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--slate)' }}>Sélectionnez un scrutin</p>
                    <p style={{ fontSize: '0.8375rem', color: 'var(--muted)', marginTop: '0.35rem' }}>Les résultats s&apos;afficheront ici</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MODALE CRÉATION SCRUTIN                    */}
      {/* ═══════════════════════════════════════════ */}
      {showModal && (
        <div className="m-overlay" onClick={() => !busy && setShowModal(false)}>
          <form className="m-box" onClick={e => e.stopPropagation()} onSubmit={(e) => void handleCreateElection(e)}>
            <div className="m-head">
              <div className="m-head-row">
                <div>
                  <h2 className="m-title">Nouveau scrutin</h2>
                  <p className="m-subtitle">Configurez les paramètres de base de l&apos;élection.</p>
                </div>
                <button type="button" className="m-close" onClick={() => setShowModal(false)}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="m-body">
              <div className="f-group">
                <label className="f-label">Titre du scrutin *</label>
                <input
                  className="f-input"
                  placeholder="Ex : Élection du bureau 2025"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                  autoFocus
                />
              </div>

              <div className="f-group">
                <label className="f-label">Description</label>
                <textarea
                  className="f-input f-textarea"
                  placeholder="Décrivez l'objet de cette élection, les règles ou informations utiles…"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
                <span className="f-hint">Visible par les membres lors du vote.</span>
              </div>

              <div className="f-group">
                <label className="f-label">Période de vote</label>
                <div className="f-date-row">
                  <div>
                    <label className="f-label" style={{ marginBottom: '0.4rem' }}>Début</label>
                    <input type="datetime-local" className="f-input" value={formData.startsAt} onChange={e => setFormData({...formData, startsAt: e.target.value})} />
                  </div>
                  <div>
                    <label className="f-label" style={{ marginBottom: '0.4rem' }}>Fin</label>
                    <input type="datetime-local" className="f-input" value={formData.endsAt} onChange={e => setFormData({...formData, endsAt: e.target.value})} />
                  </div>
                </div>
                <span className="f-hint">Optionnel — peut être défini ultérieurement.</span>
              </div>

              <div className="m-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-submit" disabled={busy || !formData.title.trim()}>
                  {busy ? <div className="spinner" /> : (
                    <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      Créer le scrutin
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODALE GESTION POSTES & CANDIDATS          */}
      {/* ═══════════════════════════════════════════ */}
      {manageElection && (
        <div className="m-overlay" onClick={() => !busy && setManageElection(null)}>
          <div className="m-box wide" onClick={e => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-head-row">
                <div>
                  <h2 className="m-title">Postes & Candidats</h2>
                  <p className="m-subtitle">{manageElection.title}</p>
                </div>
                <button className="m-close" onClick={() => setManageElection(null)}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="m-body">

              {/* Ajouter un poste */}
              {manageElection.status === 'DRAFT' && (
                <div className="pos-add-row">
                  <input
                    className="f-input"
                    placeholder="Nom du nouveau poste (ex: Président, Trésorier…)"
                    value={newPositionTitle}
                    onChange={e => setNewPositionTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void handleAddPosition()}
                  />
                  <button className="btn-add-pos" onClick={() => void handleAddPosition()} disabled={busy || !newPositionTitle.trim()}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Ajouter
                  </button>
                </div>
              )}

              {/* Liste des postes */}
              {manageElection.positions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                  Aucun poste défini. Commencez par en ajouter un.
                </div>
              ) : manageElection.positions.map(pos => (
                <div key={pos.id} className="pos-block">
                  <div className="pos-header">
                    {editingPositionId === pos.id ? (
                      <div className="pos-edit-row">
                        <input
                          className="f-input"
                          value={editingPositionTitle}
                          onChange={e => setEditingPositionTitle(e.target.value)}
                          autoFocus
                        />
                        <button className="btn-confirm-edit" onClick={() => void handleUpdatePosition(pos.id)}>✓ Sauver</button>
                        <button className="btn-cancel-edit" onClick={() => setEditingPositionId(null)}>Annuler</button>
                      </div>
                    ) : (
                      <>                        <span className="pos-title">{pos.title}</span>
                        <div className="pos-header-actions">
                          {manageElection.status === 'DRAFT' && (
                            <>
                              <button className="btn-icon" title="Renommer" onClick={() => { setEditingPositionId(pos.id); setEditingPositionTitle(pos.title); }}>
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button className="btn-icon danger" title="Supprimer ce poste" onClick={() => setConfirmDeletePosition(pos)}>
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                              {!candidateForm && (
                                <button className="btn-add-cand" onClick={() => setCandidateForm({ positionId: pos.id, userId: '', bio: '' })}>
                                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                  Candidat
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pos-body">
                    {/* Grille candidats 3 colonnes */}
                    {pos.candidates.length > 0 && (
                      <div className="cand-grid">
                        {pos.candidates.map(cand => (
                          <div key={cand.id} className="cand-card">
                            <div className="cand-avatar">
                              {cand.user.firstName[0]}{cand.user.lastName[0]}
                            </div>
                            <div className="cand-name">{cand.user.firstName}<br />{cand.user.lastName}</div>
                            {manageElection.status === 'DRAFT' && (
                              <button className="btn-remove-cand" title="Retirer" onClick={() => setConfirmDeleteCandidate(cand)}>
                                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Zone ajout candidat */}
                    {candidateForm?.positionId === pos.id && (
                      <form className="add-cand-zone" onSubmit={(e) => void handleAddCandidate(e)} style={{ position: 'relative' }}>
                        {!candidateForm.userId ? (
                          <>
                            <input
                              type="text"
                              className="f-input"
                              placeholder="Rechercher un membre actif…"
                              value={candidateSearch}
                              onChange={e => setCandidateSearch(e.target.value)}
                              autoFocus
                            />
                            {filteredMembers.length > 0 && (
                              <div className="search-dropdown">
                                {filteredMembers.map(m => (
                                  <div key={m.id} className="search-item" onClick={() => { setCandidateForm({...candidateForm, userId: m.id}); setCandidateSearch(''); }}>
                                    <div className="search-item-avatar">{m.firstName[0]}{m.lastName[0]}</div>
                                    {m.firstName} {m.lastName}
                                    <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>{m.email}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.5rem' }}>
                              <button type="button" className="btn-cancel" style={{ flex: 1, padding: '0.6rem' }} onClick={() => { setCandidateForm(null); setCandidateSearch(''); }}>Annuler</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="selected-member">
                              <div className="selected-member-info">
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--blue)' }}>
                                  {members.find(m=>m.id===candidateForm.userId)?.firstName[0]}
                                </div>
                                {members.find(m=>m.id===candidateForm.userId)?.firstName} {members.find(m=>m.id===candidateForm.userId)?.lastName}
                              </div>
                              <button type="button" className="btn-change" onClick={() => setCandidateForm({...candidateForm, userId: ''})}>Changer</button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button type="button" className="btn-cancel" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setCandidateForm(null)}>Annuler</button>
                              <button type="submit" className="btn-submit" style={{ flex: 2 }} disabled={busy}>
                                {busy ? <div className="spinner" /> : 'Confirmer l\'inscription'}
                              </button>
                            </div>
                          </>
                        )}
                      </form>
                    )}

                    {pos.candidates.length === 0 && !candidateForm && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500, textAlign: 'center', padding: '0.75rem 0' }}>Aucun candidat inscrit.</p>
                    )}
                  </div>
                </div>
              ))}

              <button className="btn-cancel" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setManageElection(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CONFIRMATION SUPPRESSION POSTE             */}
      {/* ═══════════════════════════════════════════ */}
      {confirmDeletePosition && (
        <div className="m-overlay" onClick={() => setConfirmDeletePosition(null)}>
          <div className="m-box narrow m-center" onClick={e => e.stopPropagation()}>
            <div className="m-body" style={{ paddingTop: '2rem' }}>
              <div className="confirm-icon danger">🗑️</div>
              <h2 className="m-title" style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>Supprimer ce poste ?</h2>
              <p className="m-subtitle" style={{ marginBottom: '0' }}>
                <strong>{confirmDeletePosition.title}</strong> sera supprimé.<br />
                Tous les candidats liés seront retirés.
              </p>
              <div className="m-actions">
                <button className="btn-cancel" onClick={() => setConfirmDeletePosition(null)}>Annuler</button>
                <button className="btn-submit danger" onClick={() => void executeDeletePosition()} disabled={busy}>
                  {busy ? <div className="spinner" /> : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CONFIRMATION RETRAIT CANDIDAT              */}
      {/* ═══════════════════════════════════════════ */}
      {confirmDeleteCandidate && (
        <div className="m-overlay" onClick={() => setConfirmDeleteCandidate(null)}>
          <div className="m-box narrow m-center" onClick={e => e.stopPropagation()}>
            <div className="m-body" style={{ paddingTop: '2rem' }}>
              <div className="confirm-icon warning">👤</div>
              <h2 className="m-title" style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>Retirer ce candidat ?</h2>
              <p className="m-subtitle" style={{ marginBottom: '0' }}>
                <strong>{confirmDeleteCandidate.user.firstName} {confirmDeleteCandidate.user.lastName}</strong> sera retiré de la liste.
              </p>
              <div className="m-actions">
                <button className="btn-cancel" onClick={() => setConfirmDeleteCandidate(null)}>Annuler</button>
                <button className="btn-submit danger" onClick={() => void executeDeleteCandidate()} disabled={busy}>
                  {busy ? <div className="spinner" /> : 'Retirer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CONFIRMATION SUPPRESSION SCRUTIN          */}
      {/* ═══════════════════════════════════════════ */}
      {confirmDeleteData && (
        <div className="m-overlay" onClick={() => setConfirmDeleteData(null)}>
          <div className="m-box narrow" onClick={e => e.stopPropagation()}>
            <div className="m-head">
              <h2 className="m-title" style={{ color: 'var(--red)' }}>Supprimer ce scrutin</h2>
              <p className="m-subtitle">
                Cette action est <strong>irréversible</strong>. Tapez le titre exact pour confirmer.
              </p>
            </div>
            <form onSubmit={(e) => void handleDeleteElection(e)}>
              <div className="m-body">
                <div className="f-group">
                  <label className="f-label">Tapez : <strong>{confirmDeleteData.title}</strong></label>
                  <input
                    type="text"
                    className="f-input"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    autoFocus
                    placeholder={confirmDeleteData.title}
                  />
                </div>
                <div className="m-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setConfirmDeleteData(null); setDeleteInput(''); }}>Annuler</button>
                  <button type="submit" className="btn-submit danger" disabled={busy || deleteInput !== confirmDeleteData.title}>
                    {busy ? <div className="spinner" /> : 'Supprimer définitivement'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* CONFIRMATION CHANGEMENT STATUT             */}
      {/* ═══════════════════════════════════════════ */}
      {confirmStatusData && (
        <div className="m-overlay" onClick={() => setConfirmStatusData(null)}>
          <div className="m-box narrow m-center" onClick={e => e.stopPropagation()}>
            <div className="m-body" style={{ paddingTop: '2rem' }}>
              <div className="confirm-icon" style={{ background: confirmStatusData.newStatus === 'OPEN' ? '#DCFCE7' : '#FEF2F2' }}>
                {confirmStatusData.newStatus === 'OPEN' ? '🚀' : '🛑'}
              </div>
              <h2 className="m-title" style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>
                {confirmStatusData.newStatus === 'OPEN' ? 'Lancer le vote ?' : 'Clôturer le scrutin ?'}
              </h2>
              <p className="m-subtitle" style={{ marginBottom: '0' }}>
                {confirmStatusData.newStatus === 'OPEN'
                  ? 'Les membres pourront voter dès confirmation.'
                  : 'Le scrutin sera fermé et aucun vote supplémentaire ne sera accepté.'}
              </p>
              <div className="m-actions">
                <button className="btn-cancel" onClick={() => setConfirmStatusData(null)}>Annuler</button>
                <button
                  className={`btn-submit ${confirmStatusData.newStatus === 'CLOSED' ? 'danger' : ''}`}
                  style={confirmStatusData.newStatus === 'OPEN' ? { background: '#059669' } : {}}
                  onClick={() => void executeStatusChange()}
                  disabled={busy}
                >
                  {busy ? <div className="spinner" /> : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}