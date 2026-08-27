// Équivalent en mémoire de LockService.getScriptLock() côté Apps Script :
// sérialise les opérations qui lisent-puis-écrivent une feuille (numérotation,
// traitement d'une décision...) pour éviter qu'une requête concurrente ne lise
// une valeur pas encore à jour. Ne fonctionne que parce que le process reste
// allumé en continu (Render) -- inutile/inopérant en serverless.
const tails = new Map();

export function withLock(key, fn) {
  const tail = tails.get(key) || Promise.resolve();
  const result = tail.then(fn, fn);
  tails.set(key, result.then(() => {}, () => {}));
  return result;
}
