import { useState } from 'react';
import Layout, { Logo } from '../components/Layout.jsx';
import { StatusBanner, Field, inputClass } from '../components/FormShell.jsx';
import DynamicList from '../components/DynamicList.jsx';
import { createPublicApi } from '../api.js';

const api = createPublicApi();
const MATERIEL_OPTIONS = ['Ordinateur', 'Vidéoprojecteur', 'Micro/Sono', 'Autre'];

// Seul formulaire accessible sans connexion Google (personnes extérieures à
// l'établissement) : pas de composant Layout back="/" ni de Topbar (qui
// supposent une session), un en-tête minimal suffit.
export default function FormSalle() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dates, setDates] = useState(['']);
  const [materiel, setMateriel] = useState([]);
  const [materielAutre, setMaterielAutre] = useState('');

  const [f, setF] = useState({
    demandeurNom: '', demandeurPrenom: '', demandeurEmail: '', demandeurTelephone: '', demandeurActivite: '',
    intituleFormation: '', referentNom: '', referentTelephone: '', referentEmail: '',
    horaires: '', nombreParticipants: '', formateurs: '', commentaire: ''
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  function toggleMateriel(opt) {
    setMateriel(m => m.includes(opt) ? m.filter(x => x !== opt) : [...m, opt]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanDates = dates.filter(Boolean);
    if (!cleanDates.length) { setStatus({ type: 'error', text: 'Merci de renseigner au moins une date.' }); return; }
    if (materiel.includes('Autre') && !materielAutre.trim()) {
      setStatus({ type: 'error', text: 'Merci de préciser le matériel "Autre".' }); return;
    }

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      const res = await api.post('/submit/salle', { ...f, dates: cleanDates, materiel, materielAutre });
      setStatus({ type: 'success', text: `Demande envoyée avec succès ! Numéro de demande : ${res.numeroRequest}. Un mail de confirmation vous a été envoyé.` });
      setF({ demandeurNom: '', demandeurPrenom: '', demandeurEmail: '', demandeurTelephone: '', demandeurActivite: '', intituleFormation: '', referentNom: '', referentTelephone: '', referentEmail: '', horaires: '', nombreParticipants: '', formateurs: '', commentaire: '' });
      setDates(['']);
      setMateriel([]);
      setMaterielAutre('');
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mb-5 flex items-center gap-3">
        <Logo className="h-12 w-auto" />
        <span className="text-sm font-bold text-slate-800">Demandes en ligne</span>
      </div>

      <h2 className="page-title">Réservation de salle pour formation</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Ce formulaire permet de réserver une salle pour organiser une formation dans l'établissement.
        Il est accessible sans connexion, y compris aux personnes extérieures à l'établissement.<br />
        Votre demande sera examinée par le proviseur avant validation.
      </p>

      <form onSubmit={handleSubmit}>
        <h3 className="section-title">Vos coordonnées</h3>
        <div className="flex gap-2">
          <div className="flex-1"><Field label="Nom" required>
            <input className={inputClass} required value={f.demandeurNom} onChange={set('demandeurNom')} />
          </Field></div>
          <div className="flex-1"><Field label="Prénom" required>
            <input className={inputClass} required value={f.demandeurPrenom} onChange={set('demandeurPrenom')} />
          </Field></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1"><Field label="Email" required>
            <input type="email" className={inputClass} required value={f.demandeurEmail} onChange={set('demandeurEmail')} />
          </Field></div>
          <div className="flex-1"><Field label="Numéro de téléphone" required>
            <input className={inputClass} required value={f.demandeurTelephone} onChange={set('demandeurTelephone')} />
          </Field></div>
        </div>
        <Field label="Activité / fonction" required>
          <input className={inputClass} required value={f.demandeurActivite} onChange={set('demandeurActivite')} />
        </Field>

        <h3 className="section-title mt-6">La formation</h3>
        <Field label="Intitulé de la formation" required>
          <input className={inputClass} required value={f.intituleFormation} onChange={set('intituleFormation')} />
        </Field>

        <Field label="Nom du référent.e de la formation" required>
          <input className={inputClass} required value={f.referentNom} onChange={set('referentNom')} />
        </Field>

        <div className="flex gap-2">
          <div className="flex-1">
            <Field label="Téléphone du référent.e" required>
              <input className={inputClass} required value={f.referentTelephone} onChange={set('referentTelephone')} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Email du référent.e" required>
              <input className={inputClass} required value={f.referentEmail} onChange={set('referentEmail')} />
            </Field>
          </div>
        </div>

        <DynamicList label="Date(s)" required type="date" values={dates} onChange={setDates} addLabel="Ajouter une autre date" />

        <Field label="Horaires" required>
          <input className={inputClass} placeholder="Ex : 9h00 - 17h00" required value={f.horaires} onChange={set('horaires')} />
        </Field>

        <Field label="Nombre de participants / stagiaires" required>
          <input type="number" min="1" className={inputClass} required value={f.nombreParticipants} onChange={set('nombreParticipants')} />
        </Field>

        <Field label="Nom du/de la ou des formateur.ices - Fonction" required>
          <input className={inputClass} required value={f.formateurs} onChange={set('formateurs')} />
        </Field>

        <div className="mb-4">
          <span className="label">Matériel nécessaire</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {MATERIEL_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-1.5 text-sm font-normal text-slate-700">
                <input type="checkbox" checked={materiel.includes(opt)} onChange={() => toggleMateriel(opt)} />
                {opt}
              </label>
            ))}
          </div>
          {materiel.includes('Autre') && (
            <input className={inputClass + ' mt-2'} placeholder="Précisez le matériel" value={materielAutre} onChange={e => setMaterielAutre(e.target.value)} />
          )}
        </div>

        <Field label="Ajoutez tout élément qui vous semble important et que vous n'avez pas pu préciser précédemment">
          <textarea className={inputClass + ' min-h-[70px]'} value={f.commentaire} onChange={set('commentaire')} />
        </Field>

        <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
          Envoyer la demande
        </button>
      </form>
      <StatusBanner status={status} />
    </Layout>
  );
}
