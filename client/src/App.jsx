import { useEffect, useRef, useState, useCallback } from 'react';
import { Routes, Route, Outlet, useOutletContext, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { createApi } from './api.js';
import Menu from './pages/Menu.jsx';
import FormDepense from './pages/FormDepense.jsx';
import FormRemboursement from './pages/FormRemboursement.jsx';
import FormSalle from './pages/FormSalle.jsx';
import FormSortie from './pages/FormSortie.jsx';
import FormIntervenant from './pages/FormIntervenant.jsx';
import Decision from './pages/Decision.jsx';
import Precision from './pages/Precision.jsx';
import { Logo, Topbar } from './components/Layout.jsx';

function LoginScreen() {
  const { renderButton } = useAuth();
  const ref = useRef(null);
  useEffect(() => { renderButton(ref.current); }, [renderButton]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-slate-100 px-4">
      <div className="card flex w-full max-w-sm flex-col items-center text-center">
        <Logo className="mb-4 h-20 w-auto" />
        <h1 className="mb-1.5 text-xl font-bold text-slate-900">Demandes en ligne</h1>
        <p className="mb-6 text-sm text-slate-500">Connectez-vous avec votre compte de l'établissement.</p>
        <div ref={ref} />
      </div>
    </div>
  );
}

function Shell() {
  const { idToken, forceSignOut, signOut } = useAuth();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const api = createApi(idToken, forceSignOut);
  const location = useLocation();

  const loadMe = useCallback(() => {
    api.get('/me').then(setMe).catch(err => setError(err.message));
  }, [idToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMe(); }, [loadMe, location.pathname]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-center text-red-600">
        Erreur : {error}
      </div>
    );
  }
  if (!me) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">Chargement...</div>;
  }
  return (
    <div className="min-h-screen bg-slate-100">
      <Topbar me={me} onSignOut={signOut} />
      <Outlet context={{ api, me }} />
    </div>
  );
}

export function useShell() {
  return useOutletContext();
}

export default function App() {
  const { idToken } = useAuth();

  return (
    <Routes>
      {/* Routes accessibles sans connexion : la page d'accueil (pour que les
          personnes extérieures puissent trouver le lien vers la réservation
          de salle) et le formulaire de salle lui-même. Menu.jsx gère son
          propre affichage connecté/déconnecté, voir ce fichier. */}
      <Route path="/" element={<Menu />} />
      <Route path="/salle" element={<FormSalle />} />

      {!idToken ? (
        <Route path="*" element={<LoginScreen />} />
      ) : (
        <Route element={<Shell />}>
          <Route path="/depense" element={<FormDepense />} />
          <Route path="/remboursement" element={<FormRemboursement />} />
          <Route path="/sortie" element={<FormSortie />} />
          <Route path="/intervenant" element={<FormIntervenant />} />
          <Route path="/decision/:type/:id" element={<Decision />} />
          <Route path="/precision/:type/:id" element={<Precision />} />
        </Route>
      )}
    </Routes>
  );
}
