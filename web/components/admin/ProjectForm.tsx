// web/components/admin/ProjectForm.tsx
'use client';

import { FormEvent, useState, useRef } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export interface ProjectFormValues {
  title: string;
  description: string;
  status: string;
  budgetPlanned: string;
  budgetSpent: string;
  startsAt: string;
  endsAt: string;
  photos: File[];
}

interface Props {
  initialValues?: Partial<ProjectFormValues>;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

export function ProjectForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<ProjectFormValues>({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    status: initialValues?.status || 'DRAFT',
    budgetPlanned: initialValues?.budgetPlanned || '',
    budgetSpent: initialValues?.budgetSpent || '',
    startsAt: initialValues?.startsAt || '',
    endsAt: initialValues?.endsAt || '',
    photos: [],
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...values.photos, ...newFiles];

      if (totalFiles.length > 5) {
        alert("Vous ne pouvez sélectionner que 5 photos maximum.");
        setValues({ ...values, photos: totalFiles.slice(0, 5) });
      } else {
        setValues({ ...values, photos: totalFiles });
      }
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setValues({
      ...values,
      photos: values.photos.filter((_, index) => index !== indexToRemove),
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset input pour autoriser le même fichier
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section : Informations Générales */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informations Générales</h3>
        
        <Input 
          label="Titre du projet" 
          required 
          value={values.title} 
          onChange={(e) => setValues({ ...values, title: e.target.value })} 
          placeholder="Ex: Construction d'un puits..."
          className="w-full"
        />
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Description détaillée</label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all min-h-[140px] resize-y"
            placeholder="Objectifs, bénéficiaires, localisation du projet..."
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
          />
        </div>

        <div className="w-full sm:w-1/2">
          <Select
            label="Statut actuel"
            value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value })}
            options={[
              { value: 'DRAFT', label: 'Brouillon' },
              { value: 'PENDING_APPROVAL', label: 'En attente' },
              { value: 'APPROVED', label: 'Approuvé' },
              { value: 'IN_PROGRESS', label: 'En cours' },
              { value: 'COMPLETED', label: 'Terminé' },
            ]}
          />
        </div>
      </div>

      {/* Section : Finances & Planning */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Finances & Planning</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input 
            type="number" 
            label="Budget prévu (€)" 
            value={values.budgetPlanned} 
            onChange={(e) => setValues({ ...values, budgetPlanned: e.target.value })} 
          />
          <Input 
            type="number" 
            label="Budget dépensé (€)" 
            value={values.budgetSpent} 
            onChange={(e) => setValues({ ...values, budgetSpent: e.target.value })} 
          />
          <Input 
            type="date" 
            label="Date de début" 
            value={values.startsAt} 
            onChange={(e) => setValues({ ...values, startsAt: e.target.value })} 
          />
          <Input 
            type="date" 
            label="Date de fin" 
            value={values.endsAt} 
            onChange={(e) => setValues({ ...values, endsAt: e.target.value })} 
          />
        </div>
      </div>

      {/* Section : Médias (Photos) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Photos illustratives</h3>
          <span className="text-sm text-gray-500 font-medium">
            {values.photos.length} / 5 max
          </span>
        </div>

        {/* Zone de Drop / Ajout */}
        {values.photos.length < 5 && (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-brand-blue transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg style={{ width: 40, height: 40 }} className="text-gray-400 group-hover:text-brand-blue mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-sm font-medium text-gray-700">Cliquez pour ajouter des photos</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG jusqu&apos;à 5MB</p>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Galerie de miniatures */}
        {values.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {values.photos.map((photo, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square flex items-center justify-center bg-gray-100 shadow-sm">
                {/* 👇 CORRECTION : Désactivation de l'alerte ESLint pour cette image de prévisualisation */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={URL.createObjectURL(photo)} 
                  alt={`Aperçu ${index + 1}`} 
                  className="object-cover w-full h-full"
                />
                
                {/* Bouton de suppression superposé */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    className="bg-white text-red-600 rounded-full p-2 hover:bg-red-50 transition-colors shadow-lg transform hover:scale-105"
                    title="Retirer cette photo"
                  >
                    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton de soumission */}
      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full h-12 text-base font-medium shadow-md">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg style={{ width: 20, height: 20 }} className="animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enregistrement en cours...
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}