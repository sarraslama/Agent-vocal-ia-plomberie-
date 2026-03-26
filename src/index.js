require('dotenv').config()
const express = require('express')
const cors = require('cors')
const vapiRoutes = require('./routes/vapi')

const app = express()
app.use(cors())
app.use(express.json())
app.use((req, res, next) => {
  console.log('>> Appel reçu:', req.method, req.url)
  next()
})
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PlombService API' })
})

app.use('/api/vapi', vapiRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`)
})