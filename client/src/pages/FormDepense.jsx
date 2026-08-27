import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { IdentityBox, StatusBanner, Field, inputClass } from '../components/FormShell.jsx';
import { useShell } from '../App.jsx';
import { readFileAsBase64 } from '../lib/file.js';

const today = new Date().toISOString().slice(0, 10);

export default function FormDepense() {
  const { api } = useShell();
  const [bootstrap, setBootstrap] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);

  const [f, setF] = useState({
    service: '', intitule: '', discussion: '', typeDepense: '', dateLimite: '',
    montant: '', ttcOuHt: '', fournisseur: '', contactFournisseur: '', fournisseurReference: '', complement: ''
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api.get('/bootstrap/depense').then(setBootstrap); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disabled = bootstrap && !bootstrap.nom;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { setStatus({ type: 'error', text: 'Merci de joindre un fichier PDF.' }); return; }
    if (file.type !== 'application/pdf') { setStatus({ type: 'error', text: 'Le fichier doit être au format PDF.' }); return; }
    if (file.size > 8 * 1024 * 1024) { setStatus({ type: 'error', text: 'Le fichier dépasse 8 Mo.' }); return; }
    const montantVal = f.montant.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(montantVal) || parseFloat(montantVal) <= 0) {
      setStatus({ type: 'error', text: 'Le montant saisi est invalide.' }); return;
    }

    setBusy(true);
    setStatus({ type: 'loading', text: 'Envoi en cours, merci de patienter (le fichier joint peut prendre quelques secondes)...' });
    try {
      const base64 = await readFileAsBase64(file);
      const res = await api.post('/submit/depense', {
        ...f,
        fichier: { name: file.name, mimeType: file.type, base64 }
      });
      setStatus({ type: 'success', text: `Demande envoyée avec succès ! Numéro de demande : ${res.numeroRequest}. Un mail de confirmation vous a été envoyé.` });
      setF({ service: '', intitule: '', discussion: '', typeDepense: '', dateLimite: '', montant: '', ttcOuHt: '', fournisseur: '', contactFournisseur: '', fournisseurReference: '', complement: '' });
      setFile(null);
      e.target.reset();
    } catch (err) {
      setStatus({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout back="/">
      <h2 className="page-title">Demande de dépense</h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-500">
        Ce formulaire permet de soumettre toute demande de dépense payée par le lycée.<br />
        Une pièce justificative (devis, facture pro-forma, mail, catalogue, etc.) doit être obligatoirement jointe.<br />
        Votre demande sera ensuite examinée par le proviseur et la gestionnaire avant validation.<br />
        Vous recevrez un mail de confirmation de saisie et un mail de réponse de validation ou de refus.
      </p>
      <IdentityBox identite={bootstrap} />

      {bootstrap && (
        <form onSubmit={handleSubmit}>
          <Field label="Service ou discipline" required>
            <input className={inputClass} required value={f.service} onChange={set('service')} />
          </Field>

          <Field label="Intitulé et objectif — finalité et/ou justification de la dépense" required
                 hint="Donnez un nom à cette dépense, expliquez rapidement le pourquoi, éventuellement le projet en lien.">
            <textarea className={inputClass + ' min-h-[90px]'} required value={f.intitule} onChange={set('intitule')} />
          </Field>

          <Field label="Cette dépense a-t-elle déjà fait l'objet de discussions ? A-t-elle déjà été validée ?" required
                 hint="Si oui, précisez votre ou vos interlocuteurs. Si non, indiquez... non !">
            <textarea className={inputClass + ' min-h-[70px]'} required value={f.discussion} onChange={set('discussion')} />
          </Field>

          <Field label="Type de dépense" required>
            <select className={inputClass} required value={f.typeDepense} onChange={set('typeDepense')}>
              <option value="" disabled>Choisissez un type</option>
              {bootstrap.typesDepense.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Délai de dépense (date limite de livraison souhaitée)" required>
            <input type="date" className={inputClass} min={today} required value={f.dateLimite} onChange={set('dateLimite')} />
          </Field>

          <Field label="Montant de la dépense demandée" required hint="En euros — la virgule est acceptée.">
            <div className="flex gap-2">
              <input className={inputClass} inputMode="decimal" placeholder="Ex : 150,00" required value={f.montant} onChange={set('montant')} style={{ flex: 2 }} />
              <select className={inputClass} required value={f.ttcOuHt} onChange={set('ttcOuHt')} style={{ flex: 1 }}>
                <option value="" disabled>TTC ou HT ?</option>
                <option value="TTC">TTC</option>
                <option value="HT">HT</option>
              </select>
            </div>
          </Field>

          <Field label="Pièce jointe obligatoire" required
                 hint="Un seul fichier PDF : devis, facture pro-forma, extrait de catalogue, impression écran et éventuellement mail.">
            <input type="file" accept="application/pdf" required className={inputClass}
                   onChange={e => setFile(e.target.files[0] || null)} />
          </Field>

          <Field label="Nom du fournisseur / prestataire" required hint="Indiquez tous les éléments dont vous disposez pour contacter le fournisseur.">
            <input className={inputClass} required value={f.fournisseur} onChange={set('fournisseur')} />
          </Field>

          <Field label="Si entreprise, nom de la personne à contacter" hint="Si possible, précisez numéro de téléphone et/ou adresse mail.">
            <input className={inputClass} value={f.contactFournisseur} onChange={set('contactFournisseur')} />
          </Field>

          <Field label="À votre avis, ce fournisseur est-il déjà référencé dans notre lycée ?" required hint="Avons-nous déjà travaillé avec ce fournisseur ?">
            <select className={inputClass} required value={f.fournisseurReference} onChange={set('fournisseurReference')}>
              <option value="" disabled>Choisissez une réponse</option>
              <option value="OUI">OUI</option>
              <option value="NON">NON</option>
              <option value="Je ne sais pas">Je ne sais pas</option>
            </select>
          </Field>

          <Field label="Ajoutez tout élément qui vous semble important et que vous n'avez pas pu préciser précédemment">
            <textarea className={inputClass + ' min-h-[70px]'} value={f.complement} onChange={set('complement')} />
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
