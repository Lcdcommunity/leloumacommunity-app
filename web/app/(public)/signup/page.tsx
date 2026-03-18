// web/app/(public)/signup/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '../../../lib/api-client';

type PublicAntenna = {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
};

const STEPS = ['Identité', 'Contact', 'Photo', 'Sécurité'];

export default function MemberSignupPage() {
  const [antennas, setAntennas] = useState<PublicAntenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [antennaId, setAntennaId] = useState('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  // Photo
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    setMounted(true);
    void (async () => {
      try {
        const items = await api.listPublicAntennasForSignup();
        setAntennas(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
      } finally {
        setLoadingAntennas(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); };
  }, [photoPreviewUrl]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    if (!file) { setSelectedPhotoFile(null); setPhotoPreviewUrl(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Formats autorisés : JPG, PNG, WEBP.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('La photo ne doit pas dépasser 5 Mo.');
      e.target.value = '';
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!firstName.trim()) return 'Le prénom est requis.';
      if (!lastName.trim()) return 'Le nom est requis.';
      if (!antennaId) return 'Veuillez sélectionner une antenne.';
    }
    if (s === 1) {
      if (!email.trim()) return "L'email est requis.";
      if (!/\S+@\S+\.\S+/.test(email)) return "Format d'email invalide.";
      if (!originSubPrefecture.trim()) return "La commune d'origine est requise.";
    }
    if (s === 3) {
      if (!password) return 'Le mot de passe est requis.';
      if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
      if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateStep(3);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      await api.memberSignup({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        antennaId,
        city: city || undefined,
        country: country || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        originSubPrefecture: originSubPrefecture.trim(),
      });
      // Upload photo separately if provided (best-effort, non-blocking)
      if (selectedPhotoFile) {
        try { await api.uploadProfilePhoto(selectedPhotoFile); } catch { /* ignore */ }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inscription');
    } finally {
      setSubmitting(false);
    }
  }

  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][pwdStrength];
  const strengthColor = ['', '#E05050', '#E09030', '#2d7a4f', '#1a5c38'][pwdStrength];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --g-deep:   #1A4731;
          --g-mid:    #2D6A4F;
          --g-light:  #4a9e6a;
          --g-pale:   #c8e6d4;
          --g-faint:  #e8f5ee;
          --g-border: rgba(45,106,79,0.14);
          --g-accent: rgba(45,106,79,0.08);
          --a-deep:   #92400E;
          --a-pale:   #FEF3C7;
          --a-border: #FDE68A;
          --s-dark:   #0F2318;
          --s-muted:  #52796A;
          --err:      #B91C1C;
        }

        .sp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100svh;
          background: linear-gradient(150deg, #E8F0EC 0%, #F0F7F3 40%, #E4EFE9 100%);
          display: flex; align-items: flex-start; justify-content: center;
          position: relative; overflow: hidden;
          padding: 2rem 1.25rem 3rem;
        }
        .sp-orb {
          position: fixed; border-radius: 50%;
          filter: blur(100px); pointer-events: none;
        }
        .sp-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(26,71,49,0.14) 0%, transparent 70%);
          top: -150px; right: -100px;
          animation: oa 16s ease-in-out infinite alternate;
        }
        .sp-orb-2 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(74,158,106,0.10) 0%, transparent 70%);
          bottom: -80px; left: -80px;
          animation: ob 20s ease-in-out infinite alternate;
        }
        @keyframes oa { from{transform:translate(0,0)} to{transform:translate(-40px,40px)} }
        @keyframes ob { from{transform:translate(0,0)} to{transform:translate(30px,-30px)} }
        .sp-bg-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(26,71,49,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26,71,49,0.05) 1px, transparent 1px);
          background-size: 56px 56px; pointer-events: none;
        }

        /* ── Card ── */
        .sp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 560px;
          background: rgba(247,253,249,0.95);
          backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--g-border); border-radius: 28px;
          padding: clamp(1.5rem, 5vw, 2.75rem);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.85) inset,
            0 24px 64px rgba(26,71,49,0.10),
            0 4px 16px rgba(26,71,49,0.06);
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
          margin-top: 0.5rem;
        }
        .sp-card.visible { opacity: 1; transform: translateY(0); }

        /* ── Header ── */
        .sp-header { text-align: center; margin-bottom: 1.75rem; }
        .sp-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: var(--g-faint); border: 1px solid var(--g-pale);
          border-radius: 99px; padding: 0.3rem 0.85rem;
          font-size: 0.72rem; font-weight: 600; color: var(--g-deep);
          letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.9rem;
        }
        .sp-badge-dot {
          width: 6px; height: 6px; background: var(--g-light);
          border-radius: 50%; animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .sp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 4.5vw, 2.1rem); font-weight: 500;
          color: var(--s-dark); letter-spacing: -0.02em; line-height: 1.15;
        }
        .sp-title span {
          background: linear-gradient(135deg, var(--g-deep), var(--g-light));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sp-subtitle { font-size: 0.8rem; color: var(--s-muted); margin-top: 0.45rem; line-height: 1.6; }

        /* ── Stepper ── */
        .sp-stepper {
          display: flex; align-items: center; justify-content: center;
          gap: 0; margin-bottom: 1.5rem;
        }
        .sp-step-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.35rem; position: relative; flex: 1;
        }
        .sp-step-item:not(:last-child)::after {
          content: ''; position: absolute; top: 13px;
          left: calc(50% + 14px); width: calc(100% - 28px); height: 1px;
          background: rgba(26,71,49,0.15); transition: background 0.4s;
        }
        .sp-step-item.done:not(:last-child)::after { background: var(--g-light); }
        .sp-step-circle {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid rgba(26,71,49,0.2); background: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700; color: var(--s-muted);
          transition: all 0.3s cubic-bezier(.22,1,.36,1); position: relative; z-index: 1;
        }
        .sp-step-item.active .sp-step-circle {
          border-color: var(--g-deep); background: var(--g-deep); color: white;
          box-shadow: 0 0 0 4px rgba(26,71,49,0.12);
        }
        .sp-step-item.done .sp-step-circle {
          border-color: var(--g-light); background: var(--g-faint); color: var(--g-deep);
        }
        .sp-step-label {
          font-size: 0.6rem; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--s-muted); transition: color 0.3s;
        }
        .sp-step-item.active .sp-step-label { color: var(--g-deep); }
        .sp-step-item.done .sp-step-label { color: var(--g-light); }

        /* ── Section title ── */
        .sp-section-title {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--g-mid);
          margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .sp-section-title::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg, var(--g-pale), transparent);
        }

        /* ── Layouts ── */
        .sp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .sp-stack { display: flex; flex-direction: column; gap: 0.75rem; }

        /* ── Fields ── */
        .sp-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .sp-label {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--g-mid);
        }
        .sp-label .sp-opt {
          font-weight: 400; color: var(--s-muted); text-transform: none;
          letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem;
        }
        .sp-input-wrap { position: relative; }
        .sp-input, .sp-select {
          width: 100%; min-height: 46px; border-radius: 11px;
          border: 1px solid rgba(45,106,79,0.16); background: rgba(255,255,255,0.88);
          padding: 0 0.9rem; color: var(--s-dark);
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          -webkit-appearance: none; appearance: none;
        }
        .sp-input::placeholder { color: rgba(82,121,106,0.4); }
        .sp-input:focus, .sp-select:focus {
          border-color: var(--g-mid); background: white;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.10);
        }
        .sp-input.has-icon { padding-right: 2.8rem; }
        .sp-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%231A4731' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.85rem center; padding-right: 2rem;
        }
        .sp-eye-btn {
          position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--s-muted); cursor: pointer;
          padding: 4px; display: flex; align-items: center; transition: color 0.2s;
        }
        .sp-eye-btn:hover { color: var(--g-mid); }

        /* ── Password strength ── */
        .sp-pwd-strength { display: flex; gap: 3px; margin-top: 0.4rem; align-items: center; }
        .sp-pwd-bar {
          flex: 1; height: 3px; border-radius: 99px;
          background: rgba(26,71,49,0.1); overflow: hidden;
        }
        .sp-pwd-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s, background 0.4s; }
        .sp-pwd-label { font-size: 0.65rem; font-weight: 600; margin-left: 0.4rem; min-width: 32px; }

        /* ── Notice ── */
        .sp-notice {
          background: var(--g-faint); border: 1px solid var(--g-pale); border-radius: 12px;
          padding: 0.75rem 0.85rem; font-size: 0.75rem; color: var(--g-deep);
          line-height: 1.5; margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: flex-start;
        }

        /* ── Error / Toasts ── */
        .sp-error {
          display: flex; align-items: center; gap: 0.55rem;
          padding: 0.8rem 1rem;
          background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18);
          border-radius: 12px; color: var(--err); font-size: 0.8rem; line-height: 1.45;
        }
        .sp-toast-ok {
          display: inline-flex; align-items: center; gap: 0.45rem;
          padding: 0.45rem 0.9rem; border-radius: 99px;
          font-size: 0.74rem; font-weight: 700;
          background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;
        }

        /* ── Success ── */
        .sp-success { text-align: center; padding: 0.5rem 0; }
        .sp-success-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, #DCFCE7, #BBF7D0); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0.75rem auto 1rem; box-shadow: 0 0 0 6px rgba(21,128,61,0.08);
          animation: popin 0.5s cubic-bezier(.22,1,.36,1);
        }
        @keyframes popin { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        .sp-success-title {
          font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 500;
          color: var(--s-dark); margin-bottom: 0.5rem;
        }
        .sp-success-text { font-size: 0.8rem; color: var(--s-muted); line-height: 1.6; }

        /* ── Buttons ── */
        .sp-nav { display: flex; gap: 0.6rem; margin-top: 1.5rem; }
        .sp-btn-back {
          flex: 0 0 auto; min-height: 46px; padding: 0 1rem;
          background: transparent; border: 1px solid rgba(26,71,49,0.22); border-radius: 11px;
          color: var(--g-mid); font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 0.4rem;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
        }
        .sp-btn-back:hover { background: var(--g-faint); border-color: rgba(26,71,49,0.4); transform: translateY(-1px); }
        .sp-btn-next, .sp-btn-submit {
          flex: 1; min-height: 46px;
          background: linear-gradient(135deg, var(--g-deep) 0%, var(--g-mid) 50%, var(--g-light) 100%);
          background-size: 200% 100%; background-position: 0% 0%;
          border: none; border-radius: 11px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 4px 14px rgba(26,71,49,0.25);
        }
        .sp-btn-next:hover:not(:disabled), .sp-btn-submit:hover:not(:disabled) {
          background-position: 100% 0%; box-shadow: 0 6px 20px rgba(26,71,49,0.35); transform: translateY(-1px);
        }
        .sp-btn-next:disabled, .sp-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sp-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .sp-footer {
          margin-top: 1.5rem; padding-top: 1.2rem;
          border-top: 1px solid rgba(26,71,49,0.09);
          text-align: center; font-size: 0.78rem; color: var(--s-muted);
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .sp-footer a { color: var(--g-mid); font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .sp-footer a:hover { color: var(--g-light); }
        .sp-footer-sublink { font-size: 0.72rem; font-weight: 400 !important; color: var(--s-muted) !important; }
        .sp-footer-sublink:hover { color: var(--g-mid) !important; }

        .sp-panel { animation: fadeup 0.35s cubic-bezier(.22,1,.36,1); }
        @keyframes fadeup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        /* ══════════════════════════════
           PHOTO STEP — harmonisé profil
        ══════════════════════════════ */

        .sp-photo-avatar {
          width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 1rem;
          background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 600; color: white; letter-spacing: 0.04em;
          box-shadow: 0 6px 20px rgba(26,71,49,0.25);
          overflow: hidden; transition: all 0.3s;
        }
        .sp-photo-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .sp-photo-box {
          border: 1.5px dashed rgba(45,106,79,0.22);
          border-radius: 16px; padding: 1.25rem 1rem;
          background: rgba(255,255,255,0.75); text-align: center;
        }
        .sp-photo-box-title {
          font-size: 0.88rem; font-weight: 700; color: var(--s-dark);
          margin-bottom: 0.2rem;
        }
        .sp-photo-box-sub { font-size: 0.74rem; color: var(--s-muted); line-height: 1.55; margin-bottom: 1rem; }

        .sp-photo-actions {
          display: flex; gap: 0.65rem; flex-wrap: wrap;
          align-items: center; justify-content: center; margin-top: 0.85rem;
        }
        .sp-file-label {
          min-height: 44px; padding: 0.65rem 1.1rem;
          border-radius: 11px; border: 1px solid var(--g-border);
          background: white; color: var(--g-deep);
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
          cursor: pointer; transition: border-color 0.18s, box-shadow 0.18s;
        }
        .sp-file-label:hover { border-color: var(--g-mid); box-shadow: 0 0 0 3px var(--g-accent); }
        .sp-file-input { display: none; }

        .sp-photo-remove-btn {
          min-height: 44px; padding: 0.65rem 0.95rem;
          border-radius: 11px; border: 1px solid rgba(185,28,28,0.22);
          background: rgba(185,28,28,0.04); color: #B91C1C;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;
          transition: all 0.18s;
        }
        .sp-photo-remove-btn:hover { background: rgba(185,28,28,0.08); border-color: rgba(185,28,28,0.35); }

        .sp-photo-help { font-size: 0.7rem; color: var(--s-muted); margin-top: 0.6rem; line-height: 1.5; }
        .sp-photo-filename { font-size: 0.73rem; color: var(--s-muted); margin-top: 0.4rem; word-break: break-word; }

        .sp-photo-meta {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;
        }
        .sp-photo-hint {
          display: inline-flex; align-items: center; gap: 0.38rem;
          font-size: 0.67rem; font-weight: 700; color: var(--a-deep);
          background: var(--a-pale); border: 1px solid var(--a-border);
          border-radius: 99px; padding: 0.18rem 0.6rem;
        }
        .sp-photo-skip {
          background: none; border: none; padding: 0; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.77rem; font-weight: 500;
          color: var(--s-muted); display: inline-flex; align-items: center; gap: 0.35rem;
          transition: color 0.2s;
        }
        .sp-photo-skip:hover { color: var(--g-mid); }

        /* ── Responsive ── */
        @media (max-width: 520px) {
          .sp-grid-2 { grid-template-columns: 1fr; gap: 0.6rem; }
          .sp-root { padding: 1rem 0.5rem 2rem; }
          .sp-card { border-radius: 20px; padding: 1.25rem; }
          .sp-btn-back { padding: 0 0.8rem; }
          .sp-photo-actions { flex-direction: column; align-items: stretch; }
          .sp-file-label, .sp-photo-remove-btn { width: 100%; }
        }
      `}</style>

      <div className="sp-root">
        <div className="sp-bg-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>

          {/* Header */}
          <div className="sp-header">
            <div className="sp-badge">
              <div className="sp-badge-dot" />
              Nouveau membre
            </div>
            <h1 className="sp-title">Rejoindre <span>Lélouma</span></h1>
            <p className="sp-subtitle">Créez votre compte en 4 étapes · Validation par votre antenne</p>
          </div>

          {/* Stepper */}
          {!success && (
            <div className="sp-stepper">
              {STEPS.map((label, i) => (
                <div key={label} className={`sp-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                  <div className="sp-step-circle">
                    {i < step ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span className="sp-step-label">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── SUCCESS ── */}
          {success ? (
            <div className="sp-success sp-panel">
              <div className="sp-photo-avatar" style={{width:'80px',height:'80px',fontSize:'1.7rem'}}>
                {photoPreviewUrl ? <Image src={photoPreviewUrl} alt="Photo profil" width={80} height={80} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} unoptimized /> : (initials || '?')}
              </div>
              <div className="sp-success-icon">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="sp-success-title">Inscription enregistrée !</p>
              <p className="sp-success-text">
                Vérifiez votre email pour activer votre compte,<br/>
                puis attendez la validation par l&apos;administrateur<br/>de votre antenne.
              </p>
              <div style={{marginTop:'1.5rem'}}>
                <Link href="/login" style={{
                  display:'inline-flex', alignItems:'center', gap:'0.4rem',
                  color:'var(--g-mid)', fontWeight:600, fontSize:'0.85rem', textDecoration:'none'
                }}>
                  Se connecter
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* ── STEP 0 : Identité ── */}
              {step === 0 && (
                <div className="sp-panel sp-stack">
                  <div className="sp-notice">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,marginTop:'2px'}}>
                      <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                    </svg>
                    Le compte sera activé après vérification email et validation par l&apos;administrateur de votre antenne.
                  </div>

                  <p className="sp-section-title">Informations personnelles</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Prénom</label>
                      <input className="sp-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Mamadou" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Nom</label>
                      <input className="sp-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Diallo" required />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Antenne de rattachement</label>
                    <select className="sp-select" value={antennaId} onChange={e => setAntennaId(e.target.value)} required>
                      <option value="">{loadingAntennas ? 'Chargement...' : 'Sélectionnez une antenne'}</option>
                      {antennas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}{a.city ? ` (${a.city})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── STEP 1 : Contact & Origine ── */}
              {step === 1 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Identité communautaire</p>

                  <div className="sp-field">
                    <label className="sp-label">Commune d&apos;origine</label>
                    <input className="sp-input" value={originSubPrefecture} onChange={e => setOriginSubPrefecture(e.target.value)} placeholder="Ex: Lafou" required />
                  </div>

                  <p className="sp-section-title" style={{marginTop:'0.2rem'}}>Coordonnées</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Email</label>
                      <input className="sp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Téléphone <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 …" />
                    </div>
                  </div>

                  <p className="sp-section-title" style={{marginTop:'0.2rem'}}>Lieu de résidence actuelle</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Ville <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Pays <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" />
                    </div>
                  </div>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Adresse 1 <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="12 rue de la Paix" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Adresse 2 <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Apt 3B" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2 : Photo ── */}
              {step === 2 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Photo de profil</p>

                  <div className="sp-photo-box">
                    {/* Avatar live */}
                    <div className="sp-photo-avatar">
                      {photoPreviewUrl
                        ? <Image src={photoPreviewUrl} alt="Aperçu" width={96} height={96} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} unoptimized />
                        : (initials || (
                          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        ))
                      }
                    </div>

                    {photoPreviewUrl ? (
                      <div style={{marginBottom:'0.15rem'}}>
                        <span className="sp-toast-ok">
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                          </svg>
                          Photo sélectionnée
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="sp-photo-box-title">Ajoutez votre photo</p>
                        <p className="sp-photo-box-sub">
                          Elle apparaîtra sur votre carte membre.<br/>
                          Vous pourrez la modifier depuis votre profil.
                        </p>
                      </>
                    )}

                    <div className="sp-photo-actions">
                      <label className="sp-file-label" htmlFor="signup-photo-input">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        {photoPreviewUrl ? 'Changer la photo' : 'Choisir une photo'}
                      </label>
                      <input
                        ref={photoInputRef}
                        id="signup-photo-input"
                        className="sp-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                      />
                      {photoPreviewUrl && (
                        <button type="button" className="sp-photo-remove-btn" onClick={removePhoto}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          Supprimer
                        </button>
                      )}
                    </div>

                    {selectedPhotoFile && (
                      <p className="sp-photo-filename">Fichier : <strong>{selectedPhotoFile.name}</strong></p>
                    )}
                    <p className="sp-photo-help">Max 5 Mo · JPG, PNG, WEBP</p>

                    {photoError && (
                      <div className="sp-error" style={{marginTop:'0.7rem', textAlign:'left'}}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                          <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                        </svg>
                        {photoError}
                      </div>
                    )}
                  </div>

                  <div className="sp-photo-meta">
                    <span className="sp-photo-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                      </svg>
                      Requis pour la carte membre
                    </span>
                    <button type="button" className="sp-photo-skip" onClick={nextStep}>
                      Passer cette étape
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 : Sécurité ── */}
              {step === 3 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Mot de passe</p>

                  <div className="sp-field">
                    <label className="sp-label">Mot de passe</label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="8 caractères minimum" required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                        {showPwd
                          ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                          : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    {password && (
                      <div className="sp-pwd-strength">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="sp-pwd-bar">
                            <div className="sp-pwd-bar-fill" style={{width: pwdStrength >= i ? '100%' : '0%', background: strengthColor}}/>
                          </div>
                        ))}
                        <span className="sp-pwd-label" style={{color: strengthColor}}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Confirmer le mot de passe</label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd2 ? 'text' : 'password'}
                        value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                        placeholder="Répétez le mot de passe" required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd2(v => !v)} tabIndex={-1}>
                        {showPwd2
                          ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                          : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    {passwordConfirm && (
                      <p style={{fontSize:'0.65rem', marginTop:'0.3rem', fontWeight:600,
                        color: password === passwordConfirm ? '#15803D' : '#B91C1C'}}>
                        {password === passwordConfirm ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="sp-error" style={{marginTop:'1rem'}}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="sp-nav">
                {step > 0 && (
                  <button type="button" className="sp-btn-back" onClick={prevStep}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                    </svg>
                    Retour
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" className="sp-btn-next" onClick={nextStep} disabled={step === 2 && !!photoError}>
                    {step === 2
                      ? (photoPreviewUrl ? 'Continuer avec cette photo' : 'Continuer sans photo')
                      : 'Continuer'
                    }
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                ) : (
                  <button type="submit" className="sp-btn-submit" disabled={submitting || loadingAntennas}>
                    {submitting ? (
                      <><div className="sp-spinner"/>Inscription…</>
                    ) : (
                      <>
                        Créer mon compte
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer */}
          {!success && (
            <div className="sp-footer">
              <div>Déjà membre ? <Link href="/login">Se connecter</Link></div>
              <Link href="/forgot-password" className="sp-footer-sublink">Mot de passe oublié ?</Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}