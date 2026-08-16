// web/lib/project-proposals-admin-client.ts
// v1.0 — NOUVEAU FICHIER
// 🔥 NOUVEAU : petit client isolé, ne touche pas à api-client.ts (trop
//    volumineux pour une reconstruction fiable — cf. convention "fichiers
//    indépendants"). Pointe sur /admin/project-proposals/:id, le même
//    préfixe déjà utilisé par api.listProjectProposals / .approveProjectProposal
//    / .rejectProjectProposal dans api-client.ts.

import { http } from './http';

export interface UpdateProposalAdminBody {
  title?: string;
  description?: string;
  estimatedBudget?: number | null;
}

export const projectProposalsAdminApi = {
  updateProposalSuperAdmin: (id: string, body: UpdateProposalAdminBody) =>
    http<{ id: string; title: string; description: string; estimatedBudget: number | null; status: string }, UpdateProposalAdminBody>(
      `/admin/project-proposals/${id}`,
      { method: 'PATCH', body },
    ),

  deleteProposalSuperAdmin: (id: string) =>
    http<{ message?: string }>(`/admin/project-proposals/${id}`, { method: 'DELETE' }),
};