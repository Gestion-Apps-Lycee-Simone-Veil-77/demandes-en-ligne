// Petit client HTTP pour /api/*. `onUnauthorized` est appelé automatiquement
// si le serveur renvoie 401 (jeton expiré), pour forcer une reconnexion propre.
export function createApi(idToken, onUnauthorized) {
  async function call(path, options = {}) {
    const res = await fetch('/api' + path, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + idToken
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    if (res.status === 401) { onUnauthorized?.(); throw new Error('Session expirée, reconnectez-vous.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  return {
    get: (path) => call(path),
    post: (path, body) => call(path, { method: 'POST', body }),
    del: (path) => call(path, { method: 'DELETE' })
  };
}

// Client sans jeton, pour les rares routes publiques (ex: /submit/salle,
// accessible sans compte Google pour les personnes extérieures).
export function createPublicApi() {
  async function call(path, options = {}) {
    const res = await fetch('/api' + path, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    return data;
  }

  return {
    get: (path) => call(path),
    post: (path, body) => call(path, { method: 'POST', body })
  };
}
