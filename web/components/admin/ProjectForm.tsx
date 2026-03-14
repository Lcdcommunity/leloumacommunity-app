// web/components/admin/ProjectForm.tsx
// web/components/admin/ProjectForm.tsx
'use client';

import { FormEvent, useState, useRef, DragEvent } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Icon } from '../ui/Icon'; // Ajout de tes icônes

export interface ProjectFormValues {
  title: string;
  location: string; // NOUVEAU
  promoter: string; // NOUVEAU
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
  loadingMessage?: string | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}

export function ProjectForm({ initialValues, submitLabel, loadingMessage, onSubmit }: Props) {
  const [values, setValues] = useState<ProjectFormValues>({
    title: initialValues?.title || '',
    location: initialValues?.location || '',
    promoter: initialValues?.promoter || '',
    description: initialValues?.description || '',
    status: initialValues?.status || 'DRAFT',
    budgetPlanned: initialValues?.budgetPlanned || '',
    budgetSpent: initialValues?.budgetSpent || '',
    startsAt: initialValues?.startsAt || '',
    endsAt: initialValues?.endsAt || '',
    photos: [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Logique Drag & Drop ---
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    const totalFiles = [...values.photos, ...validFiles];

    if (totalFiles.length > 5) {
      alert("Vous ne pouvez sélectionner que 5 photos maximum.");
      setValues({ ...values, photos: totalFiles.slice(0, 5) });
    } else {
      setValues({ ...values, photos: totalFiles });
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setValues({
      ...values,
      photos: values.photos.filter((_, index) => index !== indexToRemove),
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Validation ---
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!values.title.trim()) newErrors.title = "Le titre est requis.";
    if (values.startsAt && values.endsAt && new Date(values.endsAt) < new Date(values.startsAt)) {
      newErrors.endsAt = "La date de fin doit être ultérieure à la date de début.";
    }
    if (Number(values.budgetSpent) > Number(values.budgetPlanned) && values.budgetPlanned) {
      newErrors.budgetSpent = "Le budget dépensé dépasse le budget prévu.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(values);
      setValues(prev => ({ ...prev, photos: [] })); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section : Informations Générales */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
          <Icon name="document" className="w-5 h-5 text-brand-blue" />
          Informations Générales
        </h3>

        <Input 
          label="Titre du projet" 
          required 
          error={errors.title}
          value={values.title} 
          onChange={(e) => { setValues({ ...values, title: e.target.value }); setErrors({...errors, title: ''}); }} 
          placeholder="Ex: Construction d'un puits..."
          className="w-full"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input 
            label="Lieu exact" 
            value={values.location} 
            onChange={(e) => setValues({ ...values, location: e.target.value })} 
            placeholder="Ex: Commune de Lélouma, Quartier Centre"
          />
          <Input 
            label="Promoteur / Responsable" 
            value={values.promoter} 
            onChange={(e) => setValues({ ...values, promoter: e.target.value })} 
            placeholder="Ex: Association des Jeunes"
          />
        </div>

        <Textarea
          label="Description détaillée"
          placeholder="Objectifs, bénéficiaires, contexte du projet..."
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          className="min-h-[140px]"
        />

        <div className="w-full sm:w-1/2">
          <Select
            label="Statut actuel"
            value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value })}
            options={[
              { value: 'DRAFT', label: 'Brouillon' },
              { value: 'PENDING_APPROVAL', label: 'En attente d\'approbation' },
              { value: 'APPROVED', label: 'Approuvé' },
              { value: 'IN_PROGRESS', label: 'En cours de réalisation' },
              { value: 'COMPLETED', label: 'Terminé' },
            ]}
          />
        </div>
      </div>

      {/* Section : Finances & Planning */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
          <Icon name="cash" className="w-5 h-5 text-brand-green" />
          Finances & Planning
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input 
            type="number" 
            label="Budget prévu (€)" 
            min="0"
            value={values.budgetPlanned} 
            onChange={(e) => setValues({ ...values, budgetPlanned: e.target.value })} 
          />
          <Input 
            type="number" 
            label="Budget dépensé (€)" 
            min="0"
            error={errors.budgetSpent}
            value={values.budgetSpent} 
            onChange={(e) => { setValues({ ...values, budgetSpent: e.target.value }); setErrors({...errors, budgetSpent: ''}); }} 
          />
          <Input 
            type="date" 
            label="Date de début" 
            value={values.startsAt} 
            onChange={(e) => { setValues({ ...values, startsAt: e.target.value }); setErrors({...errors, endsAt: ''}); }} 
          />
          <Input 
            type="date" 
            label="Date de fin" 
            error={errors.endsAt}
            value={values.endsAt} 
            onChange={(e) => { setValues({ ...values, endsAt: e.target.value }); setErrors({...errors, endsAt: ''}); }} 
          />
        </div>
      </div>

      {/* Section : Médias (Photos) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="camera" className="w-5 h-5 text-brand-purple" />
            Galerie Photos
          </h3>
          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
            {values.photos.length} / 5 max
          </span>
        </div>

        {/* Zone de Drop / Ajout avec icônes modernes */}
        {values.photos.length < 5 && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group
              ${isDragging ? 'border-brand-blue bg-blue-50/50 scale-[1.02]' : 'border-gray-300 hover:bg-gray-50 hover:border-brand-blue'}
            `}
          >
            <div className={`p-4 rounded-full mb-3 transition-colors ${isDragging ? 'bg-brand-blue text-white' : 'bg-blue-50 text-brand-blue group-hover:bg-brand-blue group-hover:text-white'}`}>
               <Icon name="upload" className="w-8 h-8" />
            </div>
            
            <p className="text-sm font-semibold text-gray-800">
              {isDragging ? "Relâchez vos photos ici" : "Cliquez ou glissez-déposez vos photos"}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Formats acceptés : PNG, JPG, WEBP (Max 5MB)</p>
            <input 
              type="file" 
              multiple 
              accept="image/png, image/jpeg, image/webp" 
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
              <div key={`${photo.name}-${index}`} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square flex items-center justify-center bg-gray-100 shadow-sm transition-transform hover:scale-[1.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={URL.createObjectURL(photo)} 
                  alt={`Aperçu ${index + 1}`} 
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                    className="bg-white text-red-600 rounded-full p-2.5 hover:bg-red-50 transition-colors shadow-lg"
                    title="Retirer cette photo"
                  >
                    <Icon name="delete" className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton de soumission */}
      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold shadow-md tracking-wide">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg style={{ width: 20, height: 20 }} className="animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingMessage || 'Enregistrement en cours...'}
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}