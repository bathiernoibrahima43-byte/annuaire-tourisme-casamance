import { useEffect, useState } from 'react'

function afficherDate(dateTexte) {
  const [annee, mois, jour] = dateTexte.split('-')
  return `${jour}/${mois}/${annee}`
}

function Disponibilites({ prestataireId }) {
  const [dates, setDates] = useState([])
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    fetch(`/api/disponibilites.php?prestataire_id=${prestataireId}`)
      .then((reponse) => {
        if (!reponse.ok) throw new Error('Chargement des disponibilités impossible.')
        return reponse.json()
      })
      .then((resultat) => {
        if (!resultat.success) {
          throw new Error(resultat.erreur || 'Chargement des disponibilités impossible.')
        }
        setDates(resultat.data)
      })
      .catch((erreurFetch) => setErreur(erreurFetch.message))
      .finally(() => setChargement(false))
  }, [prestataireId])

  return (
    <section className="mt-3 pt-3 border-top" aria-label="Disponibilités">
      <h4 className="h6 fw-bold">Disponibilités</h4>

      {chargement && <p className="small text-secondary">Chargement…</p>}

      {erreur && <p className="small text-danger">{erreur}</p>}

      {!chargement && !erreur && dates.length === 0 && (
        <p className="small text-secondary">
          Aucune date disponible n’est renseignée pour le moment.
        </p>
      )}

      {!chargement && !erreur && dates.length > 0 && (
        <ul className="small mb-0">
          {dates.map((date) => (
            <li key={date}>{afficherDate(date)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Disponibilites
