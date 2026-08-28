import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);

// Vrai seulement une fois google.accounts.id.initialize() effectivement
// appelé (pas juste une fois le script chargé -- voir renderButton
// ci-dessous). Variable de module plutôt qu'un state : un seul AuthProvider
// existe dans l'appli, pas besoin de re-render pour ça.
let gisInitialized = false;

// Intègre Google Identity Services (le script est chargé dans index.html).
// Le jeton d'identité (JWT) obtenu après connexion est envoyé au serveur dans
// l'en-tête Authorization de chaque appel API (voir api.js) — c'est lui qui
// remplace Session.getActiveUser().getEmail() côté Apps Script.
export function AuthProvider({ children }) {
  const [idToken, setIdToken] = useState(() => sessionStorage.getItem('idToken') || null);

  useEffect(() => {
    let cancelled = false;
    function init() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { setTimeout(init, 150); return; }
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
        callback: (resp) => {
          sessionStorage.setItem('idToken', resp.credential);
          setIdToken(resp.credential);
        },
        auto_select: true
      });
      gisInitialized = true;
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Réessaie tant que google.accounts.id.initialize() (ci-dessus) n'a pas
  // effectivement été appelé, au lieu d'abandonner silencieusement. Deux
  // pièges corrigés ici : (1) le script Google se charge de façon
  // asynchrone (voir index.html), (2) même une fois chargé, appeler
  // renderButton() avant initialize() échoue aussi silencieusement -- et
  // comme cet effet (dans un composant enfant, ex: Menu) s'exécute AVANT
  // celui d'AuthProvider ci-dessus (React exécute les effets des enfants
  // avant ceux du parent), se contenter de vérifier que le script est chargé
  // ne suffisait pas : il fallait aussi attendre `gisInitialized`. Renvoie
  // une fonction d'annulation, à utiliser dans le cleanup du useEffect
  // appelant.
  const renderButton = useCallback((el) => {
    if (!el) return () => {};
    let cancelled = false;
    function attempt() {
      if (cancelled) return;
      if (!gisInitialized) { setTimeout(attempt, 150); return; }
      el.innerHTML = '';
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 280, locale: 'fr' });
    }
    attempt();
    return () => { cancelled = true; };
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem('idToken');
    setIdToken(null);
    window.google?.accounts?.id?.disableAutoSelect();
  }, []);

  // Appelé par api.js quand le serveur renvoie 401 (jeton expiré/invalide) :
  // on force une reconnexion propre plutôt que de rester bloqué sur des erreurs.
  const forceSignOut = signOut;

  return (
    <AuthContext.Provider value={{ idToken, renderButton, signOut, forceSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
