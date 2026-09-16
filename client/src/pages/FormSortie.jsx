import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { IdentityBox, StatusBanner, Field, inputClass } from '../components/FormShell.jsx';
import { useShell } from '../App.jsx';

const today = new Date().toISOString().slice(0, 10);

const PASS_CULTURE_ADAGE_OPTIONS = ['Oui', 'Non', 'Je ne sais pas encore'];

// Creneaux de l'etablissement, pour les cours a banaliser -- propres a
// CHAQUE accompagnateur (deux accompagnateurs peuvent avoir des creneaux
// differents), voir aussi server/constants.js -- meme liste, gardee en
// double comme MATERIEL_OPTIONS dans FormSalle.jsx : pas de plomberie
// bootstrap pour une liste fixe.
const COURS_BANALISABLES = [
  { code: 'M1', horaire: '8h-9h' },
  { code: 'M2', horaire: '9h-10h10' },
  { code: 'M3', horaire: '10h10-11h10' },
  { code: 'M4', horaire: '11h10-12h10' },
  { code: 'M5', horaire: '12h10-13h10' },
  { code: 'S1', horaire: '13h10-14h10' },
  { code: 'S2', horaire: '14h10-15h20' },
  { code: 'S3', horaire: '15h20-16h20' },
  { code: 'S4', horaire: '16h20-17h20' },
  { code: 'S5', horaire: '17h20-18h15' }
];
const COURS_MATIN = COURS_BANALISABLES.filter(c => c.code.startsWith('M'));
const COURS_APREM = COURS_BANALISABLES.filter(c => c.code.startsWith('S'));

const ACCOMPAGNATEUR_VIDE = { nom: '', coursBanalises: [] };

export default function FormSortie() {
  const { api } = useShell();
  const [bootstrap, setBootstrap] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [accompagnateurs, setAccompagnateurs] = useState([{ ...ACCOMPAGNATEUR_VIDE }]);

  const [f, setF] = useState({
    professeurOrganisateur: '', emailOrganisateur: '', nomSortie: '', lieuSortie: '', dateSortie: '',
    heureDepart: '', heureRetour: '', lieuDepart: '', lieuRetour: '',
    nbBilletEntreeAccompagnateurs: '0', coutBilletEntreeAccompagnateurs: '',
    nbTicketTransportAccompagnateurs: '0', coutTicketTransportAccompagnateurs: '',
    classeGroupe: '', nombreEleves: '', coutBilletEntreeEleves: '', coutTicketTransportEleves: '',
    coursAvant: '', coursApres: '', autreTransportCout: '', passCultureAdage: ''
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  function setAccompagnateurNom(i, nom) {
    const next = [...accompagnateurs];
    next[i] = { ...next[i], nom };
    setAccompagnateurs(next);
  }
  function toggleAccompagnateurCours(i, code) {
    const next = [...accompagnateurs];
    const cb = next[i].coursBanalises;
    next[i] = { ...next[i], coursBanalises: cb.includes(code) ? cb.filter(c => c !== code) : [...cb, code] };
    setAccompagnateurs(next);
  }
  function addAccompagnateur() { setAccompagnateurs([...accompagnateurs, { ...ACCOMPAGNATEUR_VIDE }]); }
  function removeAccompagnateur(i) { setAccompagnateurs(accompagnateurs.filter((_, idx) => idx !== i)); }

  useEffect(() => { api.get('/bootstrap/sortie').then(setBootstrap); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disabled = bootstrap && !bootstrap.nom;
  const nbBillet = parseInt(f.nbBilletEntreeAccompagnateurs, 10) || 0;
  const nbTicket = parseInt(f.nbTicketTransportAccompagnateurs, 10) || 0;
  const aDesEleves = (parseInt(f.nombreEleves, 10) || 0) > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanAccompagnateurs = accompagnateurs
      .map(a => ({ nom: a.nom.trim(), coursBanalises: a.coursBanalises }))
      .filter(a => a.nom);
    if (!cleanAccompagnateurs.length) { setStatus({ type: 'error', text: 'Merci de renseigner au moins un accompagnateur.' }); return; }
    if (nbBillet > 0 && !f.coutBilletEntreeAccompagnateurs.trim()) {
      setStatus({ type: 'error', text: "Merci de préciser le coût individuel du billet d'entrée." }); return;
    }
    if (nbTicket > 0 && !f.coutTicketTransportAccompagnateurs.trim()) {
      setStatus({ type: 'error', text: 'Merci de préciser le coût individuel du ticket de transport.' }); return;
    }
    if (aDesEleves && !f.coutBilletEntreeEleves.trim()) {
      setStatus({ type: 'error', text: "Merci de préciser le coût individuel du billet d'entrée pour les élèves." }); return;
    }
    if (aDesEleves && !f.coutTicketTransportEleves.trim()) {
      setStatus({ type: 'error', text: 'Merci de préciser le coût individuel du ticket de transport pour les élèves.' }); return;
    }

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours...' });
    try {
      const res = await api.post('/submit/sortie', { ...f, accompagnateurs: cleanAccompagnateurs });
      setStatus({ type: 'success', text: `Demande envoyée avec succès ! Numéro de demande : ${res.numeroRequest}. Un mail de confirmation vous a été envoyé.` });
      setF({
        professeurOrganisateur: '', emailOrganisateur: '', nomSortie: '', lieuSortie: '', dateSortie: '',
        heureDepart: '', heureRetour: '', lieuDepart: '', lieuRetour: '',
        nbBilletEntreeAccompagnateurs: '0', coutBilletEntreeAccompagnateurs: '',
        nbTicketTransportAccompagnateurs: '0', coutTicketTransportAccompagnateurs: '',
        classeGroupe: '', nombreEleves: '', coutBilletEntreeEleves: '', coutTicketTransportEleves: '',
        coursAvant: '', coursApres: '', autreTransportCout: '', passCultureAdage: ''
      });
      setAccompagnateurs([{ ...ACCOMPAGNATEUR_VIDE }]);
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout back="/">
      <h2 className="page-title">Sortie pédagogique</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Ce formulaire permet de déclarer une sortie ou un voyage scolaire.<br />
        Votre demande sera examinée par le proviseur et la gestionnaire avant validation.
      </p>
      <IdentityBox identite={bootstrap} />

      {bootstrap && (
        <form onSubmit={handleSubmit}>
          <Field label="Professeur organisateur" required>
            <input className={inputClass} required value={f.professeurOrganisateur} onChange={set('professeurOrganisateur')} />
          </Field>
          <Field label="Adresse email de l'organisateur" required>
            <input className={inputClass} required value={f.emailOrganisateur} onChange={set('emailOrganisateur')} />
          </Field>
          <Field label="Nom de la sortie" required>
            <input className={inputClass} required value={f.nomSortie} onChange={set('nomSortie')} />
          </Field>
          <Field label="Lieu de la sortie" required>
            <input className={inputClass} required value={f.lieuSortie} onChange={set('lieuSortie')} />
          </Field>
          <Field label="Date de la sortie" required>
            <input type="date" className={inputClass} min={today} required value={f.dateSortie} onChange={set('dateSortie')} />
          </Field>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Heure de départ" required>
              <input type="time" className={inputClass} required value={f.heureDepart} onChange={set('heureDepart')} />
            </Field></div>
            <div className="flex-1"><Field label="Heure de retour" required>
              <input type="time" className={inputClass} required value={f.heureRetour} onChange={set('heureRetour')} />
            </Field></div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Lieu de départ" required>
              <input className={inputClass} required value={f.lieuDepart} onChange={set('lieuDepart')} />
            </Field></div>
            <div className="flex-1"><Field label="Lieu de retour" required>
              <input className={inputClass} required value={f.lieuRetour} onChange={set('lieuRetour')} />
            </Field></div>
          </div>

          <div className="mb-4">
            <span className="label">Accompagnateurs <span className="text-red-500">*</span></span>
            <span className="mb-1.5 block text-xs text-slate-400">Chaque accompagnateur peut avoir ses propres cours à banaliser.</span>
            <div className="flex flex-col gap-2.5">
              {accompagnateurs.map((a, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2.5 flex items-end gap-2">
                    <div className="flex-1">
                      <span className="mb-1 block text-xs text-slate-400">Nom de l'accompagnateur {i + 1}</span>
                      <input className={inputClass} value={a.nom} onChange={e => setAccompagnateurNom(i, e.target.value)} required={i === 0} />
                    </div>
                    {i > 0 && (
                      <button type="button" onClick={() => removeAccompagnateur(i)} className="btn-secondary shrink-0 !px-3 text-red-600">Retirer</button>
                    )}
                  </div>

                  <span className="mb-1 block text-xs text-slate-400">Cours à banaliser pour cet accompagnateur</span>
                  <div className="grid grid-cols-2 gap-x-3">
                    <div className="flex flex-col gap-1">
                      {COURS_MATIN.map(c => (
                        <CoursCheckbox key={c.code} c={c} checked={a.coursBanalises.includes(c.code)} onToggle={() => toggleAccompagnateurCours(i, c.code)} />
                      ))}
                    </div>
                    <div className="flex flex-col gap-1">
                      {COURS_APREM.map(c => (
                        <CoursCheckbox key={c.code} c={c} checked={a.coursBanalises.includes(c.code)} onToggle={() => toggleAccompagnateurCours(i, c.code)} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addAccompagnateur} className="mt-2 rounded-xl border border-dashed border-primary-300 px-3.5 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50">
              + Ajouter un accompagnateur
            </button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Accompagnateurs — nombre de billets d'entrée">
              <input type="number" min="0" className={inputClass} value={f.nbBilletEntreeAccompagnateurs} onChange={set('nbBilletEntreeAccompagnateurs')} />
            </Field></div>
            {nbBillet > 0 && (
              <div className="flex-1"><Field label="Coût individuel du billet d'entrée" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 5,00" required value={f.coutBilletEntreeAccompagnateurs} onChange={set('coutBilletEntreeAccompagnateurs')} />
              </Field></div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Accompagnateurs — nombre de tickets de transport">
              <input type="number" min="0" className={inputClass} value={f.nbTicketTransportAccompagnateurs} onChange={set('nbTicketTransportAccompagnateurs')} />
            </Field></div>
            {nbTicket > 0 && (
              <div className="flex-1"><Field label="Coût individuel du ticket de transport" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 2,00" required value={f.coutTicketTransportAccompagnateurs} onChange={set('coutTicketTransportAccompagnateurs')} />
              </Field></div>
            )}
          </div>

          <Field label="Classe / groupe" required>
            <input className={inputClass} required value={f.classeGroupe} onChange={set('classeGroupe')} />
          </Field>
          <Field label="Nombre d'élèves" required>
            <input type="number" min="1" className={inputClass} required value={f.nombreEleves} onChange={set('nombreEleves')} />
          </Field>

          {aDesEleves && (
            <div className="flex gap-2">
              <div className="flex-1"><Field label="Élèves — coût individuel du billet d'entrée" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 5,00" required value={f.coutBilletEntreeEleves} onChange={set('coutBilletEntreeEleves')} />
              </Field></div>
              <div className="flex-1"><Field label="Élèves — coût individuel du ticket de transport" required>
                <input className={inputClass} inputMode="decimal" placeholder="Ex : 2,00" required value={f.coutTicketTransportEleves} onChange={set('coutTicketTransportEleves')} />
              </Field></div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1"><Field label="Les élèves ont-ils cours AVANT la sortie ?" required>
              <select className={inputClass} required value={f.coursAvant} onChange={set('coursAvant')}>
                <option value="" disabled>Choisissez</option>
                <option value="OUI">OUI</option>
                <option value="NON">NON</option>
              </select>
            </Field></div>
            <div className="flex-1"><Field label="Les élèves ont-ils cours APRÈS la sortie ?" required>
              <select className={inputClass} required value={f.coursApres} onChange={set('coursApres')}>
                <option value="" disabled>Choisissez</option>
                <option value="OUI">OUI</option>
                <option value="NON">NON</option>
              </select>
            </Field></div>
          </div>

          <Field label="Si autre moyen de transport (car, etc.) : coût individuel" hint="En euros — laissez vide si non concerné.">
            <input className={inputClass} inputMode="decimal" placeholder="Ex : 8,00" value={f.autreTransportCout} onChange={set('autreTransportCout')} />
          </Field>

          <Field label="Sortie liée à Pass Culture / Adage ?" required>
            <select className={inputClass} required value={f.passCultureAdage} onChange={set('passCultureAdage')}>
              <option value="" disabled>Choisissez</option>
              {PASS_CULTURE_ADAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Field>

          <button type="submit" disabled={disabled || busy} className="btn-primary w-full !py-3">
            Envoyer la demande
          </button>
        </form>
      )}
      <StatusBanner status={status} />
    </Layout>
  );
}

function CoursCheckbox({ c, checked, onToggle }) {
  return (
    <label
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${checked ? 'bg-emerald-50 text-slate-400 line-through' : 'text-slate-700 hover:bg-slate-50'}`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {c.code} : {c.horaire}
    </label>
  );
}
