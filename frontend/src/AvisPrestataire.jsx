import { useCallback, useEffect, useState } from 'react'

function AvisPrestataire({ prestataireId }) {
  const [avis, setAvis] = useState([])
  const [noteMoyenne, setNoteMoyenne] = useState(null)
  const [nom, setNom] = useState('')
  const [note, setNote] = useState('5')
  const [commentaire, setCommentaire] = useState('')
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [chargement, setChargement] = useState(true)

  const chargerAvis = useCallback(async () => {
    setErreur('')
    try {
      const reponse = await fetch(`/api/avis.php?prestataire_id=${encodeURIComponent(prestataireId)}`, {
        cache: 'no-store',
      })
      const resultat = await reponse.json()

      if (!reponse.ok || !resultat.success) {
        throw new Error(resultat.erreur || 'Impossible de charger les avis.')
      }

      setAvis(Array.isArray(resultat.data) ? resultat.data : [])
      setNoteMoyenne(resultat.moyenne ?? null)
    } catch (e) {
      setErreur(e.message || 'Impossible de charger les avis.')
    } finally {
      setChargement(false)
    }
  }, [prestataireId])

  useEffect(() => {
    let actif = true

    async function charger() {
      setChargement(true)
      try {
        const reponse = await fetch(`/api/avis.php?prestataire_id=${encodeURIComponent(prestataireId)}`, {
          cache: 'no-store',
        })
        const resultat = await reponse.json()
        if (!reponse.ok || !resultat.success) {
          throw new Error(resultat.erreur || 'Impossible de charger les avis.')
        }
        if (actif) {
          setAvis(Array.isArray(resultat.data) ? resultat.data : [])
          setNoteMoyenne(resultat.moyenne ?? null)
          setErreur('')
        }
      } catch (e) {
        if (actif) setErreur(e.message || 'Impossible de charger les avis.')
      } finally {
        if (actif) setChargement(false)
      }
    }

    charger()
    return () => { actif = false }
  }, [prestataireId])

  async function envoyerAvis(event) {
    event.preventDefault()
    setErreur('')
    setMessage('')
    setEnvoi(true)

    try {
      const reponse = await fetch('/api/avis.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prestataire_id: Number(prestataireId),
          nom_auteur: nom.trim(),
          note: Number(note),
          commentaire: commentaire.trim(),
        }),
      })
      const resultat = await reponse.json()

      if (!reponse.ok || !resultat.success) {
        throw new Error(resultat.erreur || 'Impossible d’envoyer cet avis.')
      }

      setMessage(resultat.message || 'Votre avis a été envoyé. Il sera visible après validation par l’administration.')
      setNom('')
      setNote('5')
      setCommentaire('')
      await chargerAvis()
    } catch (e) {
      setErreur(e.message || 'Impossible d’envoyer cet avis.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="mt-3 pt-3 border-top" aria-label="Avis des visiteurs">
      <h4 className="h6 fw-bold">
        Avis
        {noteMoyenne !== null && noteMoyenne !== '' ? ` — ${Number(noteMoyenne).toFixed(1).replace(/\.0$/, '')}/5` : ''}
        {` (${avis.length})`}
      </h4>

      {chargement ? (
        <p className="small text-secondary" role="status">Chargement des avis…</p>
      ) : avis.length === 0 ? (
        <p className="small text-secondary">Pas encore d’avis publié.</p>
      ) : (
        <ul className="list-unstyled small">
          {avis.slice(0, 3).map((unAvis, index) => (
            <li className="mb-2" key={unAvis.id ?? `${unAvis.date_creation}-${index}`}>
              <strong>{unAvis.nom_auteur}</strong>
              <span className="ms-2 text-warning" aria-label={`Note : ${unAvis.note} sur 5`}>
                {'★'.repeat(Math.max(0, Math.min(5, Number(unAvis.note) || 0)))}
                {'☆'.repeat(5 - Math.max(0, Math.min(5, Number(unAvis.note) || 0)))}
              </span>
              {unAvis.commentaire && <p className="mb-0">{unAvis.commentaire}</p>}
            </li>
          ))}
        </ul>
      )}

      {erreur && <div className="alert alert-danger py-2 small" role="alert">{erreur}</div>}
      {message && <div className="alert alert-success py-2 small" role="status">{message}</div>}

      <details>
        <summary className="text-success" style={{ cursor: 'pointer' }}>
          Laisser un avis
        </summary>

        <form className="mt-3" onSubmit={envoyerAvis}>
          <div className="mb-2">
            <label className="form-label small" htmlFor={`avis-nom-${prestataireId}`}>Votre nom</label>
            <input
              className="form-control form-control-sm"
              id={`avis-nom-${prestataireId}`}
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              maxLength="150"
              autoComplete="name"
              required
            />
          </div>

          <div className="mb-2">
            <label className="form-label small" htmlFor={`avis-note-${prestataireId}`}>Votre note</label>
            <select
              className="form-select form-select-sm"
              id={`avis-note-${prestataireId}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required
            >
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Très bien</option>
              <option value="3">3 — Bien</option>
              <option value="2">2 — Moyen</option>
              <option value="1">1 — Décevant</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="form-label small" htmlFor={`avis-commentaire-${prestataireId}`}>
              Commentaire (facultatif)
            </label>
            <textarea
              className="form-control form-control-sm"
              id={`avis-commentaire-${prestataireId}`}
              rows="2"
              maxLength="2000"
              value={commentaire}
              onChange={(event) => setCommentaire(event.target.value)}
            />
          </div>

          <button className="btn btn-sm btn-outline-success" type="submit" disabled={envoi}>
            {envoi ? 'Envoi en cours…' : 'Envoyer mon avis'}
          </button>
        </form>
      </details>
    </section>
  )
}

export default AvisPrestataire
