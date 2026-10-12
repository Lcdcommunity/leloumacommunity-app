// backend/src/common/utils/safe-storage-path.util.ts
//
// v1.0 — 🔥 NOUVEAU (correctif sécurité) : utilitaire isolé d'assainissement des
//   chemins de stockage. Avant, `folder` (champ libre du formulaire multipart de
//   POST /uploads/single, accessible à tout MEMBER) était injecté tel quel dans
//   `join(uploadDir, folder, year)` : avec `folder=../../src` un membre pouvait
//   écrire hors du dossier d'uploads (path traversal). L'extension venait aussi
//   telle quelle du nom de fichier client (`.html`, `.php`… servis ensuite par
//   /static sous l'origine de l'API).
//
import { BadRequestException } from '@nestjs/common';
import { extname, resolve, sep } from 'path';

/** Extensions exécutables / interprétables par un navigateur ou un serveur. */
const FORBIDDEN_EXTENSIONS = new Set([
  '.html', '.htm', '.xhtml', '.shtml', '.mhtml',
  '.js', '.mjs', '.cjs',
  '.php', '.phtml', '.phar',
  '.sh', '.bash', '.bat', '.cmd', '.ps1',
  '.exe', '.dll', '.msi', '.com', '.scr',
  '.jsp', '.asp', '.aspx', '.cgi', '.pl', '.py',
]);

const MAX_FOLDER_SEGMENTS = 5;
const MAX_SEGMENT_LENGTH = 64;

/**
 * Transforme un dossier fourni par le client en chemin relatif sûr
 * (« a/b/c », jamais absolu, jamais de « .. »). Valeur vide → `fallback`.
 */
export function sanitizeStorageFolder(
  folder: string | undefined | null,
  fallback = 'misc',
): string {
  const segments = String(folder ?? '')
    .split(/[\\/]+/)
    .map((segment) =>
      segment
        .trim()
        .replace(/[^A-Za-z0-9._-]/g, '-')
        .slice(0, MAX_SEGMENT_LENGTH),
    )
    // « . », « .. », « ... » et segments vides sont supprimés
    .filter((segment) => segment.length > 0 && !/^\.+$/.test(segment))
    .slice(0, MAX_FOLDER_SEGMENTS);

  return segments.length > 0 ? segments.join('/') : fallback;
}

/**
 * Extension sûre (minuscule, avec le point) issue du nom client, ou '' si absente.
 * Lève une 400 si l'extension est dans la liste interdite.
 */
export function sanitizeStorageExtension(fileName: string | undefined | null): string {
  const ext = extname(String(fileName ?? '')).toLowerCase();
  if (!ext) return '';

  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    throw new BadRequestException('Ce type de fichier n’est pas autorisé.');
  }
  // Extension « bizarre » (caractères spéciaux, trop longue) : on la supprime.
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
}

/**
 * Garde-fou final : vérifie que `target` reste bien DANS `baseDir` une fois résolu.
 */
export function assertInsideDirectory(baseDir: string, target: string): void {
  const base = resolve(baseDir);
  const resolved = resolve(target);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new BadRequestException('Chemin de stockage invalide.');
  }
}
