import { useCallback, useEffect, useState } from 'react'

function dateLocaleAujourdHui() {
  const date = new Date()
  const annee = date.getFullYear()
  const mois = String(date.getMonth() + 1).padStart(2, '0')
  const jour = String(date.getDate()).padStart(2, '0')
  return `${annee}-${mois}-${jour}`
}

const nouveauFormulairePrestataire = () => ({
  id: null,
  categorie_id: '',
  nom: '',
  region: '',
  ville: '',
  adresse: '',
  village_quartier: '',
  lieu_precis: '',
  latitude: '',
  longitude: '',
  type_cuisine: '',
  nom_chef: '',
  telephone: '',
  email: '',
  description: '',
  prix_indicatif: '',
  statut: 'publie',
})

const nouveauFormulaireService = (type = 'plat') => ({
  id: null,
  type_service: type,
  categorie_service: type === 'plat' ? 'Plat principal' : 'Excursion',
  titre: '',
  description: '',
  destination: '',
  lieu_depart: '',
  duree: '',
  prix_indicatif: '',
})

function Admin() {
  const [administrateur, setAdministrateur] = useState(null)
  const [reservations, setReservations] = useState([])
  const [historique, setHistorique] = useState([])
  const [avis, setAvis] = useState([])
  const [prestataires, setPrestataires] = useState([])
  const [categories, setCategories] = useState([])
  const [disponibilites, setDisponibilites] = useState([])
  const [prestataireDisponibilite, setPrestataireDisponibilite] = useState('')
  const [dateDisponibilite, setDateDisponibilite] = useState('')
  const [onglet, setOnglet] = useState('reservations')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [rechercheHistorique, setRechercheHistorique] = useState('')
  const [rechercheReservations, setRechercheReservations] = useState('')
  const [rechercheAvis, setRechercheAvis] = useState('')
  const [recherchePrestataires, setRecherchePrestataires] = useState('')
  const [formulairePrestataire, setFormulairePrestataire] = useState(nouveauFormulairePrestataire())
  const [enregistrementPrestataire, setEnregistrementPrestataire] = useState(false)
  const [prestataireServiceId, setPrestataireServiceId] = useState('')
  const [servicesPrestataire, setServicesPrestataire] = useState([])
  const [formulaireService, setFormulaireService] = useState(nouveauFormulaireService())
  const [enregistrementService, setEnregistrementService] = useState(false)

  const chargerReservations = useCallback(async () => {
    const reponse = await fetch('/api/admin_reservations.php', { credentials: 'include' })
    const resultat = await reponse.json()
    if (!reponse.ok || !resultat.success) {
      throw new Error(resultat.erreur || 'Impossible de charger les réservations.')
    }
    setReservations(resultat.data)
    setHistorique(resultat.historique || [])
  }, [])

  const chargerAvis = useCallback(async () => {
    const reponse = await fetch('/api/admin_avis.php', { credentials: 'include' })
    const resultat = await reponse.json()
    if (!reponse.ok || !resultat.success) {
      throw new Error(resultat.erreur || 'Impossible de charger les avis.')
    }
    setAvis(resultat.data)
  }, [])

  const chargerPrestataires = useCallback(async () => {
    const reponse = await fetch('/api/admin_prestataires.php', { credentials: 'include' })
    const resultat = await reponse.json()
    if (!reponse.ok || !resultat.success) {
      throw new Error(resultat.erreur || 'Impossible de charger les prestataires.')
    }
    setPrestataires(resultat.prestataires)
    setCategories(resultat.categories)
  }, [])

  const chargerDisponibilites = useCallback(async () => {
    const reponse = await fetch('/api/admin_disponibilites.php', { credentials: 'include' })
    const resultat = await reponse.json()
    if (!reponse.ok || !resultat.success) {
      throw new Error(resultat.erreur || 'Impossible de charger les disponibilités.')
    }
    setDisponibilites(resultat.data)
  }, [])

  useEffect(() => {
    async function verifierSession() {
      try {
        const reponse = await fetch('/api/session.php', { credentials: 'include' })
        const resultat = await reponse.json()
        if (resultat.connecte) setAdministrateur(resultat.administrateur)
      } catch {
        setErreur('Impossible de contacter le serveur PHP.')
      } finally {
        setChargement(false)
      }
    }
    verifierSession()
  }, [])

  useEffect(() => {
    if (!administrateur) return
    async function chargerDonnees() {
      setErreur('')
      try {
        await Promise.all([
          chargerReservations(),
          chargerAvis(),
          chargerPrestataires(),
          chargerDisponibilites(),
        ])
      } catch (e) {
        setErreur(e.message)
      }
    }
    chargerDonnees()
  }, [administrateur, chargerReservations, chargerAvis, chargerPrestataires, chargerDisponibilites])

  async function seConnecter(event) {
    event.preventDefault()
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/connexion.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mot_de_passe: motDePasse }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Connexion impossible.')
      setAdministrateur(resultat.administrateur)
      setMotDePasse('')
    } catch (e) {
      setErreur(e.message)
    }
  }

  async function changerStatutReservation(id, statut) {
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_reservations.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, statut }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Mise à jour impossible.')
      setMessage(resultat.message)
      await chargerReservations()
    } catch (e) { setErreur(e.message) }
  }

  async function changerStatutAvis(id, statut) {
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_avis.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, statut }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Mise à jour impossible.')
      setMessage(resultat.message)
      await chargerAvis()
    } catch (e) { setErreur(e.message) }
  }

  async function ajouterDisponibilite(event) {
    event.preventDefault()
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_disponibilites.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestataire_id: Number(prestataireDisponibilite), date_disponibilite: dateDisponibilite }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible d’ajouter cette date.')
      setMessage(resultat.message)
      setDateDisponibilite('')
      await chargerDisponibilites()
    } catch (e) { setErreur(e.message) }
  }

  async function supprimerDisponibilite(id) {
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_disponibilites.php', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible de supprimer cette date.')
      setMessage(resultat.message)
      await chargerDisponibilites()
    } catch (e) { setErreur(e.message) }
  }

  function modifierChampPrestataire(event) {
    const { name, value } = event.target
    setFormulairePrestataire((ancien) => ({ ...ancien, [name]: value }))
  }

  function preparerModification(prestataire) {
    setFormulairePrestataire({
      id: prestataire.id,
      categorie_id: String(prestataire.categorie_id),
      nom: prestataire.nom || '',
      region: prestataire.region || '',
      ville: prestataire.ville || '',
      adresse: prestataire.adresse || '',
      village_quartier: prestataire.village_quartier || '',
      lieu_precis: prestataire.lieu_precis || '',
      latitude: prestataire.latitude || '',
      longitude: prestataire.longitude || '',
      type_cuisine: prestataire.type_cuisine || '',
      nom_chef: prestataire.nom_chef || '',
      telephone: prestataire.telephone || '',
      email: prestataire.email || '',
      description: prestataire.description || '',
      prix_indicatif: prestataire.prix_indicatif || '',
      statut: prestataire.statut || 'publie',
    })
    setErreur('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function enregistrerPrestataire(event) {
    event.preventDefault()
    setErreur('')
    setMessage('')
    setEnregistrementPrestataire(true)
    try {
      const reponse = await fetch('/api/admin_prestataires.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formulairePrestataire,
          categorie_id: Number(formulairePrestataire.categorie_id),
          prix_indicatif: formulairePrestataire.prix_indicatif === '' ? null : Number(formulairePrestataire.prix_indicatif),
        }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible d’enregistrer le prestataire.')
      setMessage(resultat.message)
      setFormulairePrestataire(nouveauFormulairePrestataire())
      await Promise.all([chargerPrestataires(), chargerDisponibilites()])
    } catch (e) { setErreur(e.message) }
    finally { setEnregistrementPrestataire(false) }
  }

  async function archiverPrestataire(id) {
    if (!window.confirm('Archiver ce prestataire ? Il ne sera plus visible dans l’annuaire public.')) return
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_prestataires.php', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible d’archiver ce prestataire.')
      setMessage(resultat.message)
      await chargerPrestataires()
    } catch (e) { setErreur(e.message) }
  }

  async function choisirPrestataireServices(event) {
    const id = event.target.value
    const fiche = prestataires.find((p) => String(p.id) === id)
    const type = fiche?.categorie === 'Restaurant' ? 'plat' : 'offre'
    setPrestataireServiceId(id)
    setServicesPrestataire([])
    setFormulaireService(nouveauFormulaireService(type))
    setErreur('')
    setMessage('')
    if (!id) return

    try {
      const reponse = await fetch(`/api/admin_services.php?prestataire_id=${encodeURIComponent(id)}`, { credentials: 'include' })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible de charger les prestations détaillées.')
      setServicesPrestataire(resultat.data || [])
    } catch (e) {
      setErreur(e.message)
    }
  }

  function modifierChampService(event) {
    const { name, value } = event.target
    setFormulaireService((ancien) => ({ ...ancien, [name]: value }))
  }

  async function enregistrerService(event) {
    event.preventDefault()
    if (!prestataireServiceId) return
    setErreur('')
    setMessage('')
    setEnregistrementService(true)
    try {
      const reponse = await fetch('/api/admin_services.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formulaireService,
          prestataire_id: Number(prestataireServiceId),
          prix_indicatif: formulaireService.prix_indicatif === '' ? null : Number(formulaireService.prix_indicatif),
        }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible d’enregistrer la prestation.')
      setMessage(resultat.message)
      const type = prestataires.find((p) => String(p.id) === prestataireServiceId)?.categorie === 'Restaurant' ? 'plat' : 'offre'
      setFormulaireService(nouveauFormulaireService(type))
      const actualisation = await fetch(`/api/admin_services.php?prestataire_id=${encodeURIComponent(prestataireServiceId)}`, { credentials: 'include' })
      const actualisationJson = await actualisation.json()
      if (!actualisation.ok || !actualisationJson.success) throw new Error(actualisationJson.erreur || 'La prestation a été enregistrée, mais la liste n’a pas pu être rechargée.')
      setServicesPrestataire(actualisationJson.data || [])
    } catch (e) { setErreur(e.message) }
    finally { setEnregistrementService(false) }
  }

  async function archiverService(id) {
    if (!window.confirm('Archiver cette prestation ? Elle ne sera plus visible dans l’annuaire public.')) return
    setErreur('')
    setMessage('')
    try {
      const reponse = await fetch('/api/admin_services.php', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const resultat = await reponse.json()
      if (!reponse.ok || !resultat.success) throw new Error(resultat.erreur || 'Impossible d’archiver cette prestation.')
      setMessage(resultat.message)
      const actualisation = await fetch(`/api/admin_services.php?prestataire_id=${encodeURIComponent(prestataireServiceId)}`, { credentials: 'include' })
      const actualisationJson = await actualisation.json()
      if (!actualisation.ok || !actualisationJson.success) throw new Error(actualisationJson.erreur || 'La prestation a été archivée, mais la liste n’a pas pu être rechargée.')
      setServicesPrestataire(actualisationJson.data || [])
    } catch (e) { setErreur(e.message) }
  }

  function preparerModificationService(service) {
    setFormulaireService({
      id: service.id,
      type_service: service.type_service,
      categorie_service: service.categorie_service || '',
      titre: service.titre || '',
      description: service.description || '',
      destination: service.destination || '',
      lieu_depart: service.lieu_depart || '',
      duree: service.duree || '',
      prix_indicatif: service.prix_indicatif || '',
    })
    setErreur('')
    setMessage('')
  }

  async function seDeconnecter() {
    try {
      await fetch('/api/deconnexion.php', { method: 'POST', credentials: 'include' })
    } finally {
      setAdministrateur(null)
      setReservations([])
      setHistorique([])
      setAvis([])
      setPrestataires([])
      setCategories([])
      setDisponibilites([])
      setServicesPrestataire([])
      setPrestataireServiceId('')
      setFormulaireService(nouveauFormulaireService())
      setMessage('')
      setErreur('')
    }
  }

  if (chargement) return <main className="container py-5">Vérification de la session…</main>

  if (!administrateur) {
    return (
      <main className="container py-5 admin-login" style={{ maxWidth: 520 }}>
        <a href="/" className="text-success text-decoration-none">← Retour à l’annuaire</a>
        <div className="card shadow-sm border-0 mt-4"><div className="card-body p-4">
          <h1 className="h3 fw-bold mb-2">Administration</h1>
          <p className="text-secondary">Connectez-vous pour gérer les réservations, les avis, les prestataires et les disponibilités.</p>
          {erreur && <div className="alert alert-danger">{erreur}</div>}
          <form onSubmit={seConnecter}>
            <div className="mb-3"><label className="form-label" htmlFor="admin-email">Adresse e-mail</label>
              <input id="admin-email" className="form-control" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="mb-3"><label className="form-label" htmlFor="admin-password">Mot de passe</label>
              <input id="admin-password" className="form-control" type="password" autoComplete="current-password" value={motDePasse} onChange={(event) => setMotDePasse(event.target.value)} required /></div>
            <button className="btn btn-success w-100" type="submit">Se connecter</button>
          </form>
        </div></div>
      </main>
    )
  }

  const categorieSelectionnee = categories.find(
    (categorie) => String(categorie.id) === String(formulairePrestataire.categorie_id),
  )?.nom || ''

  const champsTexte = [
    ['nom', 'Nom du prestataire', true],
    ['region', 'Région', true],
    ['ville', 'Ville', true],
    ['telephone', 'Téléphone', false],
    ['email', 'E-mail', false],
    ['prix_indicatif', 'Prix indicatif (FCFA)', false],
  ]

  const historiqueFiltre = historique
    .filter((reservation) => {
      const terme = rechercheHistorique.trim().toLocaleLowerCase('fr')
      if (!terme) return true
      return [
        reservation.nom_client,
        reservation.email_client,
        reservation.nom_prestataire,
        reservation.date_modification,
        reservation.ancien_statut,
        reservation.nouveau_statut,
      ].some((valeur) => String(valeur || '').toLocaleLowerCase('fr').includes(terme))
    })
    .slice()
    .sort((a, b) => String(b.date_modification || '').localeCompare(String(a.date_modification || '')))

  const chercher = (valeurs, terme) => {
    const mot = terme.trim().toLocaleLowerCase('fr')
    if (!mot) return true
    return valeurs.some((valeur) => String(valeur || '').toLocaleLowerCase('fr').includes(mot))
  }

  const reservationsFiltrees = reservations.filter((reservation) => chercher([
    reservation.nom_client, reservation.email_client, reservation.telephone_client,
    reservation.nom_prestataire, reservation.date_debut, reservation.date_fin, reservation.statut,
  ], rechercheReservations))

  const avisFiltres = avis.filter((unAvis) => chercher([
    unAvis.nom_auteur, unAvis.nom_prestataire, unAvis.note, unAvis.commentaire, unAvis.statut,
  ], rechercheAvis))

  const prestatairesFiltresAdmin = prestataires.filter((prestataire) => chercher([
    prestataire.nom, prestataire.categorie, prestataire.ville, prestataire.region, prestataire.statut,
  ], recherchePrestataires))

  const reservationsAConfirmer = reservations.filter((reservation) => reservation.statut === 'en_attente').length
  const avisAModerer = avis.filter((unAvis) => unAvis.statut === 'en_attente').length
  const prestatairesPublies = prestataires.filter((prestataire) => prestataire.statut === 'publie').length
  const prestataireServicesChoisi = prestataires.find((p) => String(p.id) === prestataireServiceId)
  const categoriesPlats = ['Entrée', 'Plat principal', 'Dessert', 'Boisson', 'Spécialité']
  const categoriesOffres = ['Excursion', 'Circuit', 'Visite guidée', 'Transfert', 'Séjour organisé']

  return (
    <main className="container py-4 admin-dashboard">
      <div className="admin-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div><a href="/" className="text-success text-decoration-none">← Retour à l’annuaire</a>
          <h1 className="h2 fw-bold mt-2 mb-1">Espace d’administration</h1>
          <p className="text-secondary mb-0">Connecté en tant que {administrateur.nom}</p>
        </div>
        <button className="btn btn-outline-secondary" type="button" onClick={seDeconnecter}>Se déconnecter</button>
      </div>

      {erreur && <div className="alert alert-danger" role="alert">{erreur}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      <section className="admin-overview mb-4" aria-label="Résumé de l’administration">
        <article className="admin-stat-card stat-reservations">
          <span className="admin-stat-label">Réservations</span>
          <strong>{reservations.length}</strong>
          <span className="admin-stat-note">Demandes enregistrées</span>
        </article>
        <article className="admin-stat-card stat-pending">
          <span className="admin-stat-label">À confirmer</span>
          <strong>{reservationsAConfirmer}</strong>
          <span className="admin-stat-note">Réservations en attente</span>
        </article>
        <article className="admin-stat-card stat-reviews">
          <span className="admin-stat-label">Avis à modérer</span>
          <strong>{avisAModerer}</strong>
          <span className="admin-stat-note">En attente de validation</span>
        </article>
        <article className="admin-stat-card stat-providers">
          <span className="admin-stat-label">Fiches publiées</span>
          <strong>{prestatairesPublies}</strong>
          <span className="admin-stat-note">Visibles dans l’annuaire</span>
        </article>
      </section>

      <ul className="nav nav-tabs admin-tabs mb-4" aria-label="Sections d’administration">
        <li className="nav-item"><button className={`nav-link ${onglet === 'reservations' ? 'active' : ''}`} type="button" onClick={() => setOnglet('reservations')}>Réservations ({reservations.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${onglet === 'historique' ? 'active' : ''}`} type="button" onClick={() => setOnglet('historique')}>Historique ({historique.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${onglet === 'avis' ? 'active' : ''}`} type="button" onClick={() => setOnglet('avis')}>Avis ({avis.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${onglet === 'disponibilites' ? 'active' : ''}`} type="button" onClick={() => setOnglet('disponibilites')}>Disponibilités ({disponibilites.length})</button></li>
        <li className="nav-item"><button className={`nav-link ${onglet === 'prestataires' ? 'active' : ''}`} type="button" onClick={() => setOnglet('prestataires')}>Prestataires ({prestataires.length})</button></li>
      </ul>

      {onglet === 'reservations' && <div className="card border-0 shadow-sm"><div className="card-body">
        <h2 className="h5 fw-bold">Demandes de réservation</h2>
        {reservations.length === 0 ? <p className="text-secondary mb-0">Aucune réservation pour le moment.</p> : <>
          <div className="admin-search-row">
            <label className="visually-hidden" htmlFor="recherche-reservations">Rechercher une réservation</label>
            <input id="recherche-reservations" className="form-control" type="search" placeholder="Client, e-mail, prestataire, date ou statut…" value={rechercheReservations} onChange={(event) => setRechercheReservations(event.target.value)} />
            <span>{reservationsFiltrees.length} sur {reservations.length}</span>
          </div>
          {reservationsFiltrees.length === 0 ? <p className="text-secondary mt-3">Aucune réservation ne correspond à cette recherche.</p> : <div className="table-responsive mt-3"><table className="table table-striped align-middle">
            <thead><tr><th>Client</th><th>Prestataire</th><th>Dates</th><th>Personnes</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>{reservationsFiltrees.map((reservation) => <tr key={reservation.id}>
              <td><strong>{reservation.nom_client}</strong><br /><a href={`mailto:${reservation.email_client}`}>{reservation.email_client}</a>{reservation.telephone_client && <><br />{reservation.telephone_client}</>}</td>
              <td>{reservation.nom_prestataire}</td><td>{reservation.date_debut}{reservation.date_fin ? ` → ${reservation.date_fin}` : ''}</td><td>{reservation.nombre_personnes}</td>
              <td><span className={`badge ${reservation.statut === 'confirmee' ? 'text-bg-success' : reservation.statut === 'annulee' ? 'text-bg-danger' : 'text-bg-warning'}`}>{reservation.statut}</span></td>
              <td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-success" type="button" disabled={reservation.statut === 'confirmee'} onClick={() => changerStatutReservation(reservation.id, 'confirmee')}>Confirmer</button><button className="btn btn-sm btn-outline-danger" type="button" disabled={reservation.statut === 'annulee'} onClick={() => changerStatutReservation(reservation.id, 'annulee')}>Annuler</button></div></td>
            </tr>)}</tbody>
          </table></div>}
        </>}
      </div></div>}

      {onglet === 'historique' && <div className="card border-0 shadow-sm"><div className="card-body">
        <h2 className="h5 fw-bold">Historique des changements de statut</h2>
        <p className="text-secondary">Chaque ligne indique l’état de départ, le nouvel état et la date du changement. Les réservations déjà présentes ont une ligne de référence créée lors de la mise à jour.</p>
        <label className="form-label fw-semibold" htmlFor="recherche-historique">Rechercher dans l’historique</label>
        <input id="recherche-historique" className="form-control" type="search" placeholder="Nom, e-mail, prestataire, date ou statut…" value={rechercheHistorique} onChange={(event) => setRechercheHistorique(event.target.value)} />
        <p className="small text-secondary mt-2">{historiqueFiltre.length} événement(s) affiché(s)</p>
        {historiqueFiltre.length === 0 ? <p className="text-secondary mb-0">Aucun événement ne correspond à cette recherche.</p> : <div className="table-responsive mt-3"><table className="table table-striped align-middle">
          <thead><tr><th>Date du changement</th><th>Client</th><th>Prestataire</th><th>Séjour</th><th>Ancien statut</th><th>Nouveau statut</th></tr></thead>
          <tbody>{historiqueFiltre.map((evenement) => <tr key={evenement.id}>
            <td>{evenement.date_modification}</td>
            <td><strong>{evenement.nom_client}</strong><br /><a href={`mailto:${evenement.email_client}`}>{evenement.email_client}</a></td>
            <td>{evenement.nom_prestataire}</td>
            <td>{evenement.date_debut}{evenement.date_fin ? ` → ${evenement.date_fin}` : ''}</td>
            <td>{evenement.ancien_statut || 'État initial'}</td>
            <td><span className={`badge ${evenement.nouveau_statut === 'confirmee' ? 'text-bg-success' : evenement.nouveau_statut === 'annulee' ? 'text-bg-danger' : 'text-bg-warning'}`}>{evenement.nouveau_statut}</span></td>
          </tr>)}</tbody>
        </table></div>}
      </div></div>}

      {onglet === 'avis' && <div className="card border-0 shadow-sm"><div className="card-body">
        <h2 className="h5 fw-bold">Avis des visiteurs</h2>
        {avis.length === 0 ? <p className="text-secondary mb-0">Aucun avis pour le moment.</p> : <>
          <div className="admin-search-row">
            <label className="visually-hidden" htmlFor="recherche-avis">Rechercher un avis</label>
            <input id="recherche-avis" className="form-control" type="search" placeholder="Auteur, prestataire, note, commentaire ou statut…" value={rechercheAvis} onChange={(event) => setRechercheAvis(event.target.value)} />
            <span>{avisFiltres.length} sur {avis.length}</span>
          </div>
          {avisFiltres.length === 0 ? <p className="text-secondary mt-3">Aucun avis ne correspond à cette recherche.</p> : <div className="table-responsive mt-3"><table className="table table-striped align-middle">
            <thead><tr><th>Auteur</th><th>Prestataire</th><th>Note</th><th>Commentaire</th><th>Statut</th><th>Action</th></tr></thead>
            <tbody>{avisFiltres.map((unAvis) => <tr key={unAvis.id}>
              <td>{unAvis.nom_auteur}</td><td>{unAvis.nom_prestataire}</td><td>{unAvis.note}/5</td><td>{unAvis.commentaire || '—'}</td>
              <td><span className={`badge ${unAvis.statut === 'publie' ? 'text-bg-success' : unAvis.statut === 'rejete' ? 'text-bg-danger' : 'text-bg-warning'}`}>{unAvis.statut}</span></td>
              <td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-success" type="button" disabled={unAvis.statut === 'publie'} onClick={() => changerStatutAvis(unAvis.id, 'publie')}>Publier</button><button className="btn btn-sm btn-outline-danger" type="button" disabled={unAvis.statut === 'rejete'} onClick={() => changerStatutAvis(unAvis.id, 'rejete')}>Rejeter</button></div></td>
            </tr>)}</tbody>
          </table></div>}
        </>}
      </div></div>}

      {onglet === 'disponibilites' && <div className="card border-0 shadow-sm"><div className="card-body">
        <h2 className="h5 fw-bold">Gérer les disponibilités</h2>
        <form className="row g-3 align-items-end mb-4" onSubmit={ajouterDisponibilite}>
          <div className="col-12 col-md-5"><label className="form-label" htmlFor="prestataire-disponibilite">Prestataire</label>
            <select className="form-select" id="prestataire-disponibilite" value={prestataireDisponibilite} onChange={(event) => setPrestataireDisponibilite(event.target.value)} required><option value="">Choisir un prestataire</option>{prestataires.filter((p) => p.statut === 'publie').map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.ville}</option>)}</select></div>
          <div className="col-12 col-md-4"><label className="form-label" htmlFor="date-disponibilite">Date disponible</label><input className="form-control" id="date-disponibilite" type="date" min={dateLocaleAujourdHui()} value={dateDisponibilite} onChange={(event) => setDateDisponibilite(event.target.value)} required /></div>
          <div className="col-12 col-md-3"><button className="btn btn-success w-100" type="submit">Ajouter la date</button></div>
        </form>
        {disponibilites.length === 0 ? <p className="text-secondary">Aucune disponibilité enregistrée.</p> : <div className="table-responsive"><table className="table table-striped align-middle"><thead><tr><th>Prestataire</th><th>Date</th><th>Action</th></tr></thead><tbody>
          {disponibilites.map((d) => <tr key={d.id}><td>{d.nom_prestataire}</td><td>{d.date_disponibilite}</td><td><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => supprimerDisponibilite(d.id)}>Supprimer</button></td></tr>)}
        </tbody></table></div>}
      </div></div>}

      {onglet === 'prestataires' && <div className="card border-0 shadow-sm"><div className="card-body">
        <h2 className="h5 fw-bold">{formulairePrestataire.id ? 'Modifier un prestataire' : 'Ajouter un prestataire'}</h2>
        <form className="row g-3 mb-5" onSubmit={enregistrerPrestataire}>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-categorie">Catégorie</label>
            <select className="form-select" id="prest-categorie" name="categorie_id" value={formulairePrestataire.categorie_id} onChange={modifierChampPrestataire} required><option value="">Choisir une catégorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          {champsTexte.map(([nomChamp, libelle, requis]) => <div className="col-12 col-md-6" key={nomChamp}><label className="form-label" htmlFor={`prest-${nomChamp}`}>{libelle}</label><input className="form-control" id={`prest-${nomChamp}`} name={nomChamp} type={nomChamp === 'email' ? 'email' : nomChamp === 'prix_indicatif' ? 'number' : 'text'} min={nomChamp === 'prix_indicatif' ? '0' : undefined} step={nomChamp === 'prix_indicatif' ? '0.01' : undefined} value={formulairePrestataire[nomChamp]} onChange={modifierChampPrestataire} required={requis} /></div>)}
          <div className="col-12"><label className="form-label" htmlFor="prest-adresse">Adresse détaillée</label><input className="form-control" id="prest-adresse" name="adresse" value={formulairePrestataire.adresse} onChange={modifierChampPrestataire} /></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-village">Commune, village ou quartier</label><input className="form-control" id="prest-village" name="village_quartier" maxLength="160" value={formulairePrestataire.village_quartier} onChange={modifierChampPrestataire} placeholder="Ex. Cap Skirring, quartier Kabrousse" /></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-lieu-precis">Lieu précis / repère</label><input className="form-control" id="prest-lieu-precis" name="lieu_precis" maxLength="255" value={formulairePrestataire.lieu_precis} onChange={modifierChampPrestataire} placeholder="Ex. près du marché, route de la plage" /></div>
          <div className="col-12"><p className="small text-secondary mb-0">Coordonnées GPS facultatives : renseignez les deux valeurs uniquement si elles ont été vérifiées sur place.</p></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-latitude">Latitude</label><input className="form-control" id="prest-latitude" name="latitude" type="number" step="any" min="-90" max="90" value={formulairePrestataire.latitude} onChange={modifierChampPrestataire} placeholder="Ex. 12.3900" /></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-longitude">Longitude</label><input className="form-control" id="prest-longitude" name="longitude" type="number" step="any" min="-180" max="180" value={formulairePrestataire.longitude} onChange={modifierChampPrestataire} placeholder="Ex. -16.7200" /></div>
          {categorieSelectionnee === 'Restaurant' && <>
            <div className="col-12"><h3 className="h6 fw-bold mb-0">Informations culinaires</h3></div>
            <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-cuisine">Type de cuisine / spécialité</label><input className="form-control" id="prest-cuisine" name="type_cuisine" maxLength="120" value={formulairePrestataire.type_cuisine} onChange={modifierChampPrestataire} placeholder="Ex. cuisine casamançaise, fruits de mer" /></div>
            <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-chef">Nom du chef cuisinier</label><input className="form-control" id="prest-chef" name="nom_chef" maxLength="150" value={formulairePrestataire.nom_chef} onChange={modifierChampPrestataire} placeholder="À renseigner avec l’accord du restaurant" /></div>
          </>}
          <div className="col-12"><label className="form-label" htmlFor="prest-description">Description</label><textarea className="form-control" id="prest-description" name="description" rows="3" value={formulairePrestataire.description} onChange={modifierChampPrestataire} /></div>
          <div className="col-12 col-md-6"><label className="form-label" htmlFor="prest-statut">Statut de publication</label><select className="form-select" id="prest-statut" name="statut" value={formulairePrestataire.statut} onChange={modifierChampPrestataire}><option value="publie">Publié</option><option value="en_attente">En attente de validation</option><option value="archive">Archivé</option></select></div>
          <div className="col-12 d-flex gap-2"><button className="btn btn-success" type="submit" disabled={enregistrementPrestataire}>{enregistrementPrestataire ? 'Enregistrement…' : formulairePrestataire.id ? 'Enregistrer les modifications' : 'Ajouter à l’annuaire'}</button>{formulairePrestataire.id && <button className="btn btn-outline-secondary" type="button" onClick={() => setFormulairePrestataire(nouveauFormulairePrestataire())}>Annuler la modification</button>}</div>
        </form>

        <h2 className="h5 fw-bold">Fiches enregistrées ({prestataires.length})</h2>
        {prestataires.length === 0 ? <p className="text-secondary">Aucun prestataire enregistré.</p> : <>
          <div className="admin-search-row">
            <label className="visually-hidden" htmlFor="recherche-prestataires">Rechercher une fiche prestataire</label>
            <input id="recherche-prestataires" className="form-control" type="search" placeholder="Nom, catégorie, ville, région ou statut…" value={recherchePrestataires} onChange={(event) => setRecherchePrestataires(event.target.value)} />
            <span>{prestatairesFiltresAdmin.length} sur {prestataires.length}</span>
          </div>
          {prestatairesFiltresAdmin.length === 0 ? <p className="text-secondary mt-3">Aucune fiche ne correspond à cette recherche.</p> : <div className="table-responsive mt-3"><table className="table table-striped align-middle"><thead><tr><th>Nom</th><th>Catégorie</th><th>Ville / région</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
            {prestatairesFiltresAdmin.map((p) => <tr key={p.id}><td>{p.nom}</td><td>{p.categorie}</td><td>{p.ville}, {p.region}</td><td><span className={`badge ${p.statut === 'publie' ? 'text-bg-success' : p.statut === 'archive' ? 'text-bg-secondary' : 'text-bg-warning'}`}>{p.statut}</span></td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => preparerModification(p)}>Modifier</button>{p.statut !== 'archive' && <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => archiverPrestataire(p.id)}>Archiver</button>}</div></td></tr>)}
          </tbody></table></div>}
        </>}

        <hr className="my-5" />
        <section aria-labelledby="titre-prestations-detaillees">
          <h2 className="h5 fw-bold" id="titre-prestations-detaillees">Plats et offres détaillés</h2>
          <p className="text-secondary">Ajoutez les spécialités d’un restaurant ou les circuits et prestations d’une agence. Les offres d’agence doivent préciser une destination et un lieu de départ.</p>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="prestataire-services">Restaurant ou agence</label>
            <select className="form-select" id="prestataire-services" value={prestataireServiceId} onChange={choisirPrestataireServices}>
              <option value="">Choisir une fiche</option>
              {prestataires.filter((p) => p.statut !== 'archive' && ['Restaurant', 'Agence de voyage'].includes(p.categorie)).map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.categorie}</option>)}
            </select>
          </div>

          {prestataireServicesChoisi && <>
            <form className="row g-3 border rounded-3 bg-light-subtle p-3 mb-4" onSubmit={enregistrerService}>
              <div className="col-12"><h3 className="h6 fw-bold mb-0">{formulaireService.id ? 'Modifier une prestation' : prestataireServicesChoisi.categorie === 'Restaurant' ? 'Ajouter un plat ou une spécialité' : 'Ajouter une offre de voyage'}</h3></div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="service-categorie">{prestataireServicesChoisi.categorie === 'Restaurant' ? 'Catégorie du plat' : 'Catégorie de l’offre'}</label>
                <select className="form-select" id="service-categorie" name="categorie_service" value={formulaireService.categorie_service} onChange={modifierChampService} required>
                  {(prestataireServicesChoisi.categorie === 'Restaurant' ? categoriesPlats : categoriesOffres).map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-6"><label className="form-label" htmlFor="service-titre">{prestataireServicesChoisi.categorie === 'Restaurant' ? 'Nom du plat / de la spécialité' : 'Nom de l’offre'}</label><input className="form-control" id="service-titre" name="titre" maxLength="150" value={formulaireService.titre} onChange={modifierChampService} required /></div>
              {prestataireServicesChoisi.categorie === 'Agence de voyage' && <>
                <div className="col-12 col-md-4"><label className="form-label" htmlFor="service-destination">Destination précise</label><input className="form-control" id="service-destination" name="destination" maxLength="180" value={formulaireService.destination} onChange={modifierChampService} required placeholder="Ex. île de Carabane" /></div>
                <div className="col-12 col-md-4"><label className="form-label" htmlFor="service-depart">Lieu exact de départ</label><input className="form-control" id="service-depart" name="lieu_depart" maxLength="180" value={formulaireService.lieu_depart} onChange={modifierChampService} required placeholder="Ex. embarcadère de Ziguinchor" /></div>
                <div className="col-12 col-md-4"><label className="form-label" htmlFor="service-duree">Durée indicative</label><input className="form-control" id="service-duree" name="duree" maxLength="80" value={formulaireService.duree} onChange={modifierChampService} placeholder="Ex. journée complète" /></div>
              </>}
              <div className="col-12 col-md-4"><label className="form-label" htmlFor="service-prix">Prix indicatif (FCFA)</label><input className="form-control" id="service-prix" name="prix_indicatif" type="number" min="0" step="0.01" value={formulaireService.prix_indicatif} onChange={modifierChampService} /></div>
              <div className="col-12"><label className="form-label" htmlFor="service-description">Description / composition</label><textarea className="form-control" id="service-description" name="description" rows="2" maxLength="5000" value={formulaireService.description} onChange={modifierChampService} placeholder={prestataireServicesChoisi.categorie === 'Restaurant' ? 'Précisez les ingrédients ou la spécialité, après vérification avec le restaurant.' : 'Précisez le programme ou les conditions, après vérification avec l’agence.'} /></div>
              <div className="col-12 d-flex flex-wrap gap-2"><button className="btn btn-success" type="submit" disabled={enregistrementService}>{enregistrementService ? 'Enregistrement…' : formulaireService.id ? 'Enregistrer la prestation' : 'Ajouter à la fiche'}</button>{formulaireService.id && <button className="btn btn-outline-secondary" type="button" onClick={() => setFormulaireService(nouveauFormulaireService(prestataireServicesChoisi.categorie === 'Restaurant' ? 'plat' : 'offre'))}>Annuler la modification</button>}</div>
            </form>

            <h3 className="h6 fw-bold">Prestations enregistrées ({servicesPrestataire.length})</h3>
            {servicesPrestataire.length === 0 ? <p className="text-secondary">Aucun plat ou offre enregistré pour cette fiche.</p> : <div className="table-responsive"><table className="table table-striped align-middle"><thead><tr><th>Catégorie</th><th>Intitulé</th><th>Destination / départ</th><th>Prix</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
              {servicesPrestataire.map((service) => <tr key={service.id}><td>{service.categorie_service}</td><td><strong>{service.titre}</strong>{service.description && <div className="small text-secondary">{service.description}</div>}</td><td>{service.type_service === 'offre' ? <>{service.destination}<br /><span className="small text-secondary">Départ : {service.lieu_depart}</span></> : '—'}</td><td>{service.prix_indicatif ? `${new Intl.NumberFormat('fr-FR').format(Number(service.prix_indicatif))} FCFA` : 'Sur demande'}</td><td><span className={`badge ${service.statut === 'publie' ? 'text-bg-success' : 'text-bg-secondary'}`}>{service.statut}</span></td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => preparerModificationService(service)}>Modifier</button>{service.statut === 'publie' && <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => archiverService(service.id)}>Archiver</button>}</div></td></tr>)}
            </tbody></table></div>}
          </>}
        </section>
      </div></div>}
    </main>
  )
}

export default Admin
