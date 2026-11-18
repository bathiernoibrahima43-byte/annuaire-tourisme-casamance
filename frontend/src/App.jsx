import { useEffect, useMemo, useState } from 'react'
import Admin from './Admin.jsx'
import AvisPrestataire from './AvisPrestataire.jsx'
import Disponibilites from './Disponibilites.jsx'
import './App.css'

const categories = [
  'Tous',
  'Hébergement',
  'Restaurant',
  'Guide touristique',
  'Artisan',
  'Agence de voyage',
  'Institution locale',
]

const imagesParCategorie = {
  Hébergement: '/images/hebergement.jpg',
  Restaurant: '/images/restaurant.jpg',
  'Guide touristique': '/images/guide.jpg',
  Artisan: '/images/artisan.jpg',
  'Agence de voyage': '/images/agence.jpg',
  'Institution locale': '/images/institution.jpg',
}

function dateDuJour() {
  const date = new Date()
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

function afficherPrixService(prix) {
  if (prix === null || prix === undefined || prix === '') return 'Tarif sur demande'
  return `${new Intl.NumberFormat('fr-FR').format(Number(prix))} FCFA`
}

function InformationsDetaillees({ prestataire, details, servicesChoisis, onToggleService }) {
  if (!details) return null
  const estRestaurant = prestataire.categorie === 'Restaurant'
  const estAgence = prestataire.categorie === 'Agence de voyage'
  const services = (details.services || []).filter((service) =>
    (estRestaurant && service.type_service === 'plat')
    || (estAgence && service.type_service === 'offre'),
  )
  const aLieu = details.village_quartier || details.lieu_precis
  const aCuisine = estRestaurant && (details.type_cuisine || details.nom_chef)
  const aCarteOuOffres = (estRestaurant || estAgence) && services.length > 0
  const coordonnees = details.latitude !== null && details.latitude !== ''
    && details.longitude !== null && details.longitude !== ''

  if (!aLieu && !aCuisine && !aCarteOuOffres && !coordonnees) return null

  return (
    <section className="provider-details" aria-label="Informations détaillées">
      {aLieu && <div className="provider-detail-location">
        <strong>Localisation précise</strong>
        <span>{[details.village_quartier, details.lieu_precis].filter(Boolean).join(' · ')}</span>
      </div>}
      {aCuisine && <div className="provider-detail-cuisine">
        {details.type_cuisine && <p><strong>Cuisine :</strong> {details.type_cuisine}</p>}
        {details.nom_chef && <p><strong>Chef :</strong> {details.nom_chef}</p>}
      </div>}
      {aCarteOuOffres && <div className="provider-service-list">
        <h4>{estRestaurant ? 'Plats et spécialités' : 'Offres de voyage'}</h4>
        <p className="provider-service-hint">Cochez les prestations souhaitées pour les joindre à votre demande.</p>
        <ul>
          {services.map((service) => <li key={service.id}>
            <div className="provider-service-title">
              <label className="provider-service-choice" htmlFor={`service-${prestataire.id}-${service.id}`}>
                <input
                  id={`service-${prestataire.id}-${service.id}`}
                  type="checkbox"
                  checked={servicesChoisis.includes(String(service.id))}
                  onChange={() => onToggleService(prestataire.id, service.id)}
                />
                <span>Choisir</span>
              </label>
              <span className="provider-service-category">{service.categorie_service}</span>
              <strong>{service.titre}</strong>
              <span className="provider-service-price">{afficherPrixService(service.prix_indicatif)}</span>
            </div>
            {estAgence && <p className="provider-service-route"><strong>Destination :</strong> {service.destination || 'À préciser'} · <strong>Départ :</strong> {service.lieu_depart || 'À préciser'}{service.duree ? ` · ${service.duree}` : ''}</p>}
            {service.description && <p className="provider-service-description">{service.description}</p>}
          </li>)}
        </ul>
      </div>}
      {coordonnees && <a className="provider-map-link" href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(details.latitude)}&mlon=${encodeURIComponent(details.longitude)}#map=16/${encodeURIComponent(details.latitude)}/${encodeURIComponent(details.longitude)}`} target="_blank" rel="noreferrer">Voir le point GPS sur la carte</a>}
    </section>
  )
}

function Annuaire() {
  const [prestataires, setPrestataires] = useState([])
  const [detailsParPrestataire, setDetailsParPrestataire] = useState({})
  const [disponibilitesParPrestataire, setDisponibilitesParPrestataire] = useState({})
  const [recherche, setRecherche] = useState('')
  const [categorieChoisie, setCategorieChoisie] = useState('Tous')
  const [regionChoisie, setRegionChoisie] = useState('Toutes')
  const [prixMinimum, setPrixMinimum] = useState('')
  const [prixMaximum, setPrixMaximum] = useState('')
  const [dateRecherche, setDateRecherche] = useState('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [prestataireChoisi, setPrestataireChoisi] = useState(null)
  const [servicesChoisisParPrestataire, setServicesChoisisParPrestataire] = useState({})
  const [formulaire, setFormulaire] = useState({
    nom_client: '',
    email_client: '',
    telephone_client: '',
    date_debut: '',
    date_fin: '',
    nombre_personnes: 1,
    message: '',
  })
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreurReservation, setErreurReservation] = useState('')
  const [confirmationReservation, setConfirmationReservation] = useState('')

  useEffect(() => {
    let actif = true

    async function chargerAnnuaire() {
      try {
        const reponse = await fetch('/api/prestataires.php')
        const resultat = await reponse.json()
        if (!reponse.ok || !resultat.success) {
          throw new Error(resultat.erreur || 'Impossible de charger les prestataires.')
        }

        const liste = resultat.data || []
        if (!actif) return
        setPrestataires(liste)

        const reponseDetails = await fetch('/api/prestataire_details.php')
        const resultatDetails = await reponseDetails.json()
        if (!reponseDetails.ok || !resultatDetails.success) {
          throw new Error(resultatDetails.erreur || 'Impossible de charger les spécialités et localisations détaillées.')
        }
        if (actif) setDetailsParPrestataire(resultatDetails.data || {})

        const disponibilites = await Promise.all(
          liste.map(async (prestataire) => {
            try {
              const reponseDates = await fetch(
                `/api/disponibilites.php?prestataire_id=${prestataire.id}`,
              )
              const resultatDates = await reponseDates.json()
              return [
                String(prestataire.id),
                resultatDates.success ? resultatDates.data : [],
              ]
            } catch {
              return [String(prestataire.id), []]
            }
          }),
        )

        if (actif) setDisponibilitesParPrestataire(Object.fromEntries(disponibilites))
      } catch (e) {
        if (actif) setErreur(e.message)
      } finally {
        if (actif) setChargement(false)
      }
    }

    chargerAnnuaire()
    return () => { actif = false }
  }, [])

  const regions = useMemo(
    () => [...new Set(prestataires.map((p) => p.region).filter(Boolean))].sort(),
    [prestataires],
  )

  const prestatairesFiltres = useMemo(() => {
    const texte = recherche.trim().toLocaleLowerCase('fr')
    const min = prixMinimum === '' ? null : Number(prixMinimum)
    const max = prixMaximum === '' ? null : Number(prixMaximum)

    return prestataires.filter((prestataire) => {
      const details = detailsParPrestataire[String(prestataire.id)] || {}
      const texteServices = (details.services || []).flatMap((service) => [
        service.type_service,
        service.categorie_service,
        service.titre,
        service.description,
        service.destination,
        service.lieu_depart,
        service.duree,
      ])
      const texteComplet = [
        prestataire.nom,
        prestataire.ville,
        prestataire.region,
        prestataire.categorie,
        prestataire.description,
        details.type_cuisine,
        details.nom_chef,
        details.village_quartier,
        details.lieu_precis,
        ...texteServices,
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr')

      const prix = prestataire.prix_indicatif === null || prestataire.prix_indicatif === ''
        ? null
        : Number(prestataire.prix_indicatif)

      const texteOK = !texte || texteComplet.includes(texte)
      const categorieOK = categorieChoisie === 'Tous' || prestataire.categorie === categorieChoisie
      const regionOK = regionChoisie === 'Toutes' || prestataire.region === regionChoisie
      const minimumOK = min === null || (prix !== null && prix >= min)
      const maximumOK = max === null || (prix !== null && prix <= max)
      const dateOK = !dateRecherche || (disponibilitesParPrestataire[String(prestataire.id)] || []).includes(dateRecherche)

      return texteOK && categorieOK && regionOK && minimumOK && maximumOK && dateOK
    })
  }, [prestataires, detailsParPrestataire, recherche, categorieChoisie, regionChoisie, prixMinimum, prixMaximum, dateRecherche, disponibilitesParPrestataire])

  function afficherPrix(prix) {
    if (prix === null || prix === '') return 'Tarifs sur demande'
    return `À partir de ${new Intl.NumberFormat('fr-FR').format(Number(prix))} FCFA`
  }

  function ouvrirFormulaire(prestataire) {
    setPrestataireChoisi(prestataire)
    setErreurReservation('')
    setConfirmationReservation('')
    setFormulaire({
      nom_client: '', email_client: '', telephone_client: '',
      date_debut: '', date_fin: '', nombre_personnes: 1, message: '',
    })
  }

  function basculerService(prestataireId, serviceId) {
    const cle = String(prestataireId)
    const id = String(serviceId)
    setServicesChoisisParPrestataire((ancien) => {
      const dejaChoisi = ancien[cle] || []
      const selection = dejaChoisi.includes(id)
        ? dejaChoisi.filter((element) => element !== id)
        : [...dejaChoisi, id]
      return { ...ancien, [cle]: selection }
    })
  }

  function fermerFormulaire() {
    setPrestataireChoisi(null)
    setErreurReservation('')
    setConfirmationReservation('')
  }

  function modifierChamp(event) {
    const { name, value } = event.target
    setFormulaire((ancien) => ({ ...ancien, [name]: value }))
  }

  function reinitialiserFiltres() {
    setRecherche('')
    setCategorieChoisie('Tous')
    setRegionChoisie('Toutes')
    setPrixMinimum('')
    setPrixMaximum('')
    setDateRecherche('')
  }

  async function envoyerReservation(event) {
    event.preventDefault()
    setErreurReservation('')
    setConfirmationReservation('')

    const details = detailsParPrestataire[String(prestataireChoisi.id)] || {}
    const servicesPublies = (details.services || []).filter((service) =>
      (prestataireChoisi.categorie === 'Restaurant' && service.type_service === 'plat')
      || (prestataireChoisi.categorie === 'Agence de voyage' && service.type_service === 'offre'),
    )
    const idsSelectionnes = servicesChoisisParPrestataire[String(prestataireChoisi.id)] || []
    const servicesSelectionnes = servicesPublies.filter((service) => idsSelectionnes.includes(String(service.id)))
    if (servicesPublies.length > 0 && servicesSelectionnes.length === 0) {
      setErreurReservation('Choisissez au moins un plat ou une offre sur la fiche avant d’envoyer votre demande.')
      return
    }

    setEnvoiEnCours(true)

    try {
      const resumePrestations = servicesSelectionnes.map((service) => {
        const trajet = service.type_service === 'offre'
          ? ` — destination : ${service.destination || 'à préciser'}, départ : ${service.lieu_depart || 'à préciser'}`
          : ''
        return `- ${service.categorie_service} : ${service.titre}${trajet}`
      }).join('\n')
      const messageClient = formulaire.message.trim()
      const messageComplet = [
        messageClient,
        resumePrestations ? `Prestations choisies par le client :\n${resumePrestations}` : '',
      ].filter(Boolean).join('\n\n')
      const reponse = await fetch('/api/reservations.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formulaire,
          message: messageComplet,
          prestataire_id: prestataireChoisi.id,
          nombre_personnes: Number(formulaire.nombre_personnes),
        }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) {
        throw new Error(resultat.erreur || 'La demande n’a pas pu être envoyée.')
      }
      setConfirmationReservation(resultat.message)
    } catch (e) {
      setErreurReservation(e.message)
    } finally {
      setEnvoiEnCours(false)
    }
  }

  const prestationsChoisiesPourReservation = prestataireChoisi
    ? (detailsParPrestataire[String(prestataireChoisi.id)]?.services || []).filter((service) =>
      (servicesChoisisParPrestataire[String(prestataireChoisi.id)] || []).includes(String(service.id)),
    )
    : []

  return (
    <div id="accueil">
      <nav className="navbar navbar-expand-lg bg-white border-bottom">
        <div className="container py-2">
          <a className="navbar-brand fw-bold brand-name" href="/">
            <span className="brand-mark">C</span> Casamance Tourisme
          </a>
          <div className="d-flex gap-2">
            <a className="btn btn-outline-success" href="#prestataires">Explorer</a>
            <a className="btn btn-success" href="/admin">Administration</a>
          </div>
        </div>
      </nav>

      <header className="hero-section">
        <div className="container py-5">
          <div className="hero-content">
            <p className="text-uppercase fw-semibold eyebrow">L’annuaire des acteurs du tourisme</p>
            <h1 className="display-4 fw-bold">Découvrez la Casamance autrement</h1>
            <p className="lead mt-3">
              Trouvez des hébergements, restaurants, guides, artisans, agences et institutions locales.
            </p>
            <a className="btn btn-light btn-lg mt-3" href="#prestataires">Découvrir les professionnels</a>
          </div>
        </div>
      </header>

      <main className="container py-5" id="prestataires">
        <div className="directory-heading d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <p className="text-success fw-semibold mb-1">ANNUAIRE TOURISTIQUE</p>
            <h2 className="fw-bold mb-0">Les professionnels locaux</h2>
            <p className="directory-subtitle mb-0">Trouvez un service adapté à votre séjour en Casamance.</p>
          </div>
          <span className="results-pill" role="status">
            <strong>{prestatairesFiltres.length}</strong>
            {prestatairesFiltres.length === 1 ? ' résultat' : ' résultats'}
          </span>
        </div>

        <section className="search-panel p-3 p-md-4 mb-4" aria-label="Recherche multicritère">
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label htmlFor="recherche" className="form-label fw-semibold">Mot-clé, nom, ville ou activité</label>
              <input id="recherche" className="form-control" type="search" placeholder="Ex. hôtel, guide, Ziguinchor…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="filtre-categorie" className="form-label fw-semibold">Catégorie</label>
              <select id="filtre-categorie" className="form-select" value={categorieChoisie} onChange={(e) => setCategorieChoisie(e.target.value)}>
                {categories.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="filtre-region" className="form-label fw-semibold">Région</label>
              <select id="filtre-region" className="form-select" value={regionChoisie} onChange={(e) => setRegionChoisie(e.target.value)}>
                <option value="Toutes">Toutes les régions</option>
                {regions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="prix-min" className="form-label fw-semibold">Prix minimum (FCFA)</label>
              <input id="prix-min" className="form-control" type="number" min="0" placeholder="Sans minimum" value={prixMinimum} onChange={(e) => setPrixMinimum(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="prix-max" className="form-label fw-semibold">Prix maximum (FCFA)</label>
              <input id="prix-max" className="form-control" type="number" min="0" placeholder="Sans maximum" value={prixMaximum} onChange={(e) => setPrixMaximum(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label htmlFor="date-disponible" className="form-label fw-semibold">Disponible à cette date</label>
              <input id="date-disponible" className="form-control" type="date" min={dateDuJour()} value={dateRecherche} onChange={(e) => setDateRecherche(e.target.value)} />
            </div>
            <div className="col-12 col-lg-3 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" type="button" onClick={reinitialiserFiltres}>Effacer les filtres</button>
            </div>
          </div>
        </section>

        <section className="category-explorer mb-4" aria-label="Explorer les catégories">
          <div className="category-explorer-heading">
            <div>
              <h3>Explorer par activité</h3>
              <p>Choisissez une catégorie pour filtrer l’annuaire.</p>
            </div>
          </div>
          <div className="quick-category-list" aria-label="Filtres rapides par catégorie">
            {categories.map((categorie) => (
              <button
                key={categorie}
                type="button"
                className={`btn category-filter-button ${categorieChoisie === categorie ? 'btn-success is-selected' : 'btn-outline-success'}`}
                aria-pressed={categorieChoisie === categorie}
                onClick={() => setCategorieChoisie(categorie)}
              >
                {categorie}
              </button>
            ))}
          </div>
        </section>

        {chargement && <p className="text-secondary" role="status">Chargement des professionnels…</p>}
        {erreur && <div className="alert alert-danger" role="alert">{erreur}</div>}

        {!chargement && !erreur && (
          <div className="row g-4">
            {prestatairesFiltres.map((prestataire) => {
              const image = prestataire.photo || imagesParCategorie[prestataire.categorie] || '/images/institution.jpg'
              const details = detailsParPrestataire[String(prestataire.id)]
              return (
                <div className="col-12 col-md-6 col-lg-4" key={prestataire.id}>
                  <article className="card provider-card h-100">
                    <div className="provider-image">
                      <img className="provider-photo" src={image} alt={`Illustration : ${prestataire.categorie}`} loading="lazy" />
                      <span className="badge text-bg-light category-badge">{prestataire.categorie}</span>
                      <span className="provider-photo-caption">Casamance · tourisme local</span>
                    </div>
                    <div className="card-body provider-body d-flex flex-column">
                      <div className="provider-heading">
                        <h3 className="provider-title">{prestataire.nom}</h3>
                        <p className="provider-location">
                          <span className="location-mark" aria-hidden="true">⌖</span>
                          <span>{prestataire.ville || 'Ville non précisée'}{details?.village_quartier ? ` · ${details.village_quartier}` : ''}{prestataire.region ? ` · ${prestataire.region}` : ''}</span>
                        </p>
                      </div>
                      <p className="provider-description">{prestataire.description || 'Aucune description disponible.'}</p>
                      <InformationsDetaillees
                        prestataire={prestataire}
                        details={details}
                        servicesChoisis={servicesChoisisParPrestataire[String(prestataire.id)] || []}
                        onToggleService={basculerService}
                      />
                      <div className="provider-price">
                        <span>Tarif indicatif</span>
                        <strong>{afficherPrix(prestataire.prix_indicatif)}</strong>
                      </div>
                      {dateRecherche && (
                        <p className="provider-availability" role="status">
                          <span aria-hidden="true">✓</span> Disponible le {dateRecherche}
                        </p>
                      )}
                      <button className="btn btn-success provider-booking-btn" type="button" onClick={() => ouvrirFormulaire(prestataire)}>
                        <span>Demander une réservation</span><span aria-hidden="true">→</span>
                      </button>
                      <div className="provider-card-sections">
                        <AvisPrestataire prestataireId={prestataire.id} />
                        <Disponibilites prestataireId={prestataire.id} />
                      </div>
                    </div>
                  </article>
                </div>
              )
            })}
          </div>
        )}

        {!chargement && !erreur && prestatairesFiltres.length === 0 && (
          <div className="alert alert-info mt-4" role="status">Aucun résultat ne correspond aux filtres. Essayez de les modifier ou de les effacer.</div>
        )}
      </main>

      <footer className="footer-section">
        <div className="container footer-content">
          <div className="footer-main">
            <a className="footer-brand" href="#accueil" aria-label="Casamance Tourisme — retour en haut">
              <span className="brand-mark footer-mark">C</span>
              <span className="footer-brand-copy">
                <strong>Casamance Tourisme</strong>
                <small>L’annuaire des acteurs du tourisme</small>
              </span>
            </a>
            <p className="footer-description">
              Découvrez les hébergements, restaurants, guides, artisans, agences et institutions locales.
            </p>
            <nav className="footer-links" aria-label="Liens de pied de page">
              <a href="#prestataires">Explorer l’annuaire</a>
              <a href="/admin">Espace d’administration</a>
              <a href="#accueil">Retour en haut ↑</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>Projet de mémoire — Licence 3</span>
            <span>Annuaire numérique des acteurs du tourisme en Casamance</span>
          </div>
        </div>
      </footer>

      {prestataireChoisi && (
        <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) fermerFormulaire() }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="dialog" aria-modal="true" aria-labelledby="titre-reservation">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h2 className="modal-title h5 fw-bold" id="titre-reservation">Demander une réservation</h2>
                  <p className="text-secondary mb-0">{prestataireChoisi.nom}</p>
                </div>
                <button type="button" className="btn-close" aria-label="Fermer" onClick={fermerFormulaire} />
              </div>
              <div className="modal-body">
                {confirmationReservation ? (
                  <div>
                    <div className="alert alert-success" role="status">{confirmationReservation}</div>
                    <p className="small text-secondary">Votre demande n’est pas encore confirmée. L’administrateur doit la traiter.</p>
                    <button className="btn btn-success" type="button" onClick={fermerFormulaire}>Terminer</button>
                  </div>
                ) : (
                  <form onSubmit={envoyerReservation}>
                    {erreurReservation && <div className="alert alert-danger" role="alert">{erreurReservation}</div>}
                    {prestationsChoisiesPourReservation.length > 0 && <div className="alert alert-success py-2" role="status">
                      <strong>Votre sélection :</strong>
                      <ul className="mb-0 mt-1">{prestationsChoisiesPourReservation.map((service) => <li key={service.id}>{service.titre}{service.type_service === 'offre' ? ` — ${service.destination}` : ''}</li>)}</ul>
                    </div>}
                    {['Restaurant', 'Agence de voyage'].includes(prestataireChoisi.categorie)
                      && (detailsParPrestataire[String(prestataireChoisi.id)]?.services || []).some((service) =>
                        (prestataireChoisi.categorie === 'Restaurant' && service.type_service === 'plat')
                        || (prestataireChoisi.categorie === 'Agence de voyage' && service.type_service === 'offre'),
                      )
                      && prestationsChoisiesPourReservation.length === 0
                      && <p className="small text-secondary">Choisissez au moins une prestation sur la fiche, puis revenez ici pour envoyer votre demande.</p>}
                    <div className="mb-3"><label className="form-label" htmlFor="nom-client">Votre nom</label><input className="form-control" id="nom-client" name="nom_client" value={formulaire.nom_client} onChange={modifierChamp} required maxLength="150" /></div>
                    <div className="mb-3"><label className="form-label" htmlFor="email-client">Adresse e-mail</label><input className="form-control" id="email-client" name="email_client" type="email" value={formulaire.email_client} onChange={modifierChamp} required maxLength="150" /></div>
                    <div className="mb-3"><label className="form-label" htmlFor="telephone-client">Téléphone (facultatif)</label><input className="form-control" id="telephone-client" name="telephone_client" type="tel" value={formulaire.telephone_client} onChange={modifierChamp} /></div>
                    <div className="row">
                      <div className="col-sm-6 mb-3"><label className="form-label" htmlFor="date-debut">Date d’arrivée</label><input className="form-control" id="date-debut" name="date_debut" type="date" min={dateDuJour()} value={formulaire.date_debut} onChange={modifierChamp} required /></div>
                      <div className="col-sm-6 mb-3"><label className="form-label" htmlFor="date-fin">Date de départ</label><input className="form-control" id="date-fin" name="date_fin" type="date" min={formulaire.date_debut || dateDuJour()} value={formulaire.date_fin} onChange={modifierChamp} required /></div>
                    </div>
                    <div className="mb-3"><label className="form-label" htmlFor="nombre-personnes">Nombre de personnes</label><input className="form-control" id="nombre-personnes" name="nombre_personnes" type="number" min="1" max="100" value={formulaire.nombre_personnes} onChange={modifierChamp} required /></div>
                    <div className="mb-3"><label className="form-label" htmlFor="message-client">Message (facultatif)</label><textarea className="form-control" id="message-client" name="message" rows="3" value={formulaire.message} onChange={modifierChamp} /></div>
                    <button className="btn btn-success w-100" type="submit" disabled={envoiEnCours}>{envoiEnCours ? 'Envoi en cours…' : 'Envoyer la demande'}</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  if (window.location.pathname === '/admin') return <Admin />
  return <Annuaire />
}
