import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { StatusBanner } from '../components/FormShell.jsx';
import { RecapTable } from '../components/Recap.jsx';
import { useShell } from '../App.jsx';

export default function Precision() {
  const { type, id } = useParams();
  const { api } = useShell();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [texte, setTexte] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/precision/${type}/${id}`).then(setData).catch(err => setError(err.message));
  }, [type, id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function envoyer() {
    if (!texte.trim()) { setStatus({ type: 'error', text: 'Merci de renseigner votre réponse.' }); return; }
    if (!window.confirm("Confirmer l'envoi de ces précisions au proviseur ?")) return;

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      await api.post(`/precision/${type}/${id}`, { texte });
      setStatus({ type: 'success', text: 'Vos précisions ont été envoyées au proviseur.' });
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
      setBusy(false);
    }
  }

  if (error) return <Layout><p className="font-semibold text-red-600">{error}</p></Layout>;
  if (!data) return <Layout>Chargement...</Layout>;

  return (
    <Layout>
      <h1 className="page-title !mb-2">Précisions demandées — {data.numeroRequest}</h1>
      <p className="mb-3 text-sm text-slate-500">
        Le proviseur souhaite les précisions suivantes avant de statuer sur votre {data.libelle.toLowerCase()} :
      </p>
      <p className="mb-5 whitespace-pre-wrap rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm">{data.commentaireDirecteur}</p>

      <h2 className="section-title">Rappel de votre demande</h2>
      <RecapTable recap={data.recap} pieceJointe={data.pieceJointe} />

      <h2 className="section-title mt-5">Votre réponse</h2>
      <label className="mb-4 block">
        <span className="label">Précisions à apporter <span className="text-red-500">*</span></span>
        <textarea className="input min-h-[110px]" value={texte} onChange={e => setTexte(e.target.value)} disabled={status?.type === 'success'} />
      </label>

      <button type="button" disabled={busy || status?.type === 'success'} className="btn-primary w-full !py-3" onClick={envoyer}>
        Envoyer mes précisions
      </button>
      <StatusBanner status={status} />
    </Layout>
  );
}
