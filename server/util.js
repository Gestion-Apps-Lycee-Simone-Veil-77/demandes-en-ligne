import { randomUUID } from 'node:crypto';

export function uuid() {
  return randomUUID();
}

// jj/mm/aaaa, fuseau Europe/Paris.
export function formatDateFr(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d);
}

export function formatDateTimeFr(value) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d)) return String(value);
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(d).replace(',', '');
}

// Les heures sont saisies et stockees en texte "HH:mm" (l'API Sheets, contrairement
// a l'UI Sheets, ne les reinterprete pas en heure/Date -- ce champ existe surtout
// par coherence avec la logique cote formatage/affichage).
export function formatHeureFr(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(value);
  }
  return String(value);
}

export function formatMontant(value) {
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Ramene une valeur (Date, chaine ISO, chaine "YYYY-MM-DD", nombre, texte...) a
// une forme comparable et lisible.
export function formatValueForDiff(v) {
  if (v instanceof Date) return formatDateFr(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d)) return formatDateFr(d);
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + 'T00:00:00');
    if (!isNaN(d)) return formatDateFr(d);
  }
  return v === undefined || v === null || v === '' ? '(vide)' : v;
}

export function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    const val = JSON.parse(str);
    return Array.isArray(val) ? val : fallback;
  } catch (e) {
    return fallback;
  }
}
