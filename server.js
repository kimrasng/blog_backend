const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const app = express()

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(cookieParser())
app.use(express.json())

app.use('/auth/discord', require('./src/auth/discord'))
app.use('/select', require('./src/blog/select'))
app.use('/test', require('./src/test'))
app.use('/add', require('./src/blog/add'))

app.get('/', (req, res) => {
  res.send('kimrasng Blog API')
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
