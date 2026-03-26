const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.use((req, res, next) => {
  console.log('>> Requête reçue:', req.method, req.path)
  next()
})

router.post('/get-creneaux', async (req, res) => {
  console.log('get-creneaux appelé')

  const { data, error } = await supabase
    .from('creneaux')
    .select(`
      id,
      debut,
      fin,
      plombiers (
        nom,
        specialites
      )
    `)
    .eq('disponible', true)
    .gte('debut', new Date().toISOString())
    .lte('debut', new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString())
    .order('debut', { ascending: true })
    .limit(6)

if (error) {
    console.log('Erreur Supabase complète:', JSON.stringify(error))
    return res.json({ result: 'Erreur lors de la récupération des créneaux' })
  }
  console.log('Créneaux trouvés:', data.length)

  const creneauxFormates = data.map(c => ({
    id: c.id,
    plombier: c.plombiers.nom,
    debut: new Date(c.debut).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit'
    }),
    fin: new Date(c.fin).toLocaleString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    })
  }))

  res.json({ result: JSON.stringify({ creneaux: creneauxFormates }) })
})

router.post('/reserver-rdv', async (req, res) => {
  console.log('reserver-rdv appelé')
  const body = req.body.message ? req.body.message : req.body
  const { creneau_id, client_nom, client_telephone, client_adresse, type_probleme } = body

  const { data: creneau } = await supabase
    .from('creneaux')
    .select('id, plombier_id, disponible')
    .eq('id', creneau_id)
    .single()

  if (!creneau || !creneau.disponible) {
    return res.json({ result: 'Ce créneau vient d\'être pris. Je vous propose un autre horaire.' })
  }

  const { data: rdv, error: rdvError } = await supabase
    .from('rendez_vous')
    .insert({
      creneau_id,
      plombier_id: creneau.plombier_id,
      client_nom,
      client_telephone,
      client_adresse,
      type_probleme
    })
    .select()
    .single()

  if (rdvError) {
    console.log('Erreur RDV:', rdvError)
    return res.json({ result: 'Erreur lors de la réservation' })
  }

  await supabase
    .from('creneaux')
    .update({ disponible: false })
    .eq('id', creneau_id)

  res.json({ result: `RDV confirmé pour ${client_nom}` })
})

router.post('/annuler-rdv', async (req, res) => {
  console.log('annuler-rdv appelé')
  const body = req.body.message ? req.body.message : req.body
  const { rdv_id } = body

  const { data: rdv } = await supabase
    .from('rendez_vous')
    .select('id, creneau_id')
    .eq('id', rdv_id)
    .single()

  if (!rdv) return res.json({ result: 'RDV introuvable' })

  await supabase.from('rendez_vous').update({ statut: 'annule' }).eq('id', rdv_id)
  await supabase.from('creneaux').update({ disponible: true }).eq('id', rdv.creneau_id)

  res.json({ result: 'RDV annulé avec succès' })
})

module.exports = router