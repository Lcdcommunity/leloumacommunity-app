//web/app/(protected)/super-admin/settings/page.tsx
'use client';

import { FormEvent, useEffect, useState, ChangeEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import type { Association } from '../../../../types/association';

export default function SuperAdminSettingsPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const a = await api.getAssociation();
        setAssociation(a);
        setName(a.name);
        setCode(a.code);
        setIsActive(a.isActive);
      } catch (err) {
        setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de chargement' });
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      await api.updateAssociation({ name, code, isActive });
      setMsg({ type: 'success', text: 'Paramètres mis à jour avec succès !' });
      const updated = await api.getAssociation();
      setAssociation(updated);
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de sauvegarde' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Paramètres Généraux">
      {/* Grille : 1 colonne sur mobile, 2 colonnes sur Desktop pour équilibrer l'espace */}
      <div className="grid grid-2 gap-lg items-start">
        
        {/* Colonne Gauche : Formulaire Principal */}
        <Card title="Configuration de l&apos;Association">
          <form onSubmit={onSubmit} className="stack-lg">
            <div className="stack-md">
              <Input 
                label="Nom officiel de l&apos;organisation" 
                value={name} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} 
                required 
                placeholder="Ex: Ma Super Association"
              />
              <Input 
                label="Identifiant unique (Code)" 
                value={code} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())} 
                required 
                placeholder="Ex: ASSOC-01"
              />
              
              <div className="py-sm">
                <label className="checkbox-row clickable">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setIsActive(e.target.checked)} 
                  />
                  <div className="checkbox-content">
                    <span className="weight-bold">Statut de l&apos;association</span>
                    <p className="text-muted text-sm">Désactiver l&apos;association bloque l&apos;accès à tous les membres.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Positionnement moderne : Bouton ancré en bas à droite du formulaire */}
            <div className="flex justify-end items-center gap-md border-top pt-md">
              {msg ? (
                <span className={`text-sm ${msg.type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {msg.text}
                </span>
              ) : null}
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Colonne Droite : Informations Système & Règles */}
        <Card title="Détails du Système">
          <div className="stack-md">
            <div className="info-grid">
              <div className="info-item border-bottom pb-sm mb-sm">
                <span className="text-muted text-xs uppercase weight-bold">ID Système</span>
                <p className="font-mono text-sm">{association?.id ?? '—'}</p>
              </div>
              <div className="info-item border-bottom pb-sm mb-sm">
                <span className="text-muted text-xs uppercase weight-bold">Date de création</span>
                <p className="text-sm">{association ? formatDate(association.createdAt) : '—'}</p>
              </div>
              <div className="info-item border-bottom pb-sm mb-sm">
                <span className="text-muted text-xs uppercase weight-bold">Dernière modification</span>
                <p className="text-sm">{association ? formatDate(association.updatedAt) : '—'}</p>
              </div>
            </div>

            {/* Encadré d'information moderne */}
            <div className="p-md bg-light radius-md mt-lg border-left-info">
              <div className="flex gap-sm">
                <span>ℹ️</span>
                <div className="text-sm">
                  <strong className="block mb-xs">Règle de gouvernance</strong>
                  <p className="text-muted">
                    Ces paramètres impactent l&apos;ensemble des antennes. Seul le profil 
                    <strong> Super Admin</strong> possède les privilèges nécessaires pour modifier ces informations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </AppShell>
  );
}