const express = require('express')
const axios = require('axios')
const mysql = require('mysql2/promise')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')
const crypto = require('crypto')
dotenv.config()

const router = express.Router()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
})

const clientId = process.env.DISCORD_CLIENT
const clientSecret = process.env.DISCORD_CLIENT_SECRET
const redirectUri = process.env.DISCORD_REDIRECT_URI
const scope = 'identify email'

const algorithm = 'aes-256-cbc'
const key = crypto.scryptSync(process.env.COOKIE_SECRET, 'salt', 32)

function encrypt(text) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText) {
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts.shift(), 'hex')
    const encrypted = parts.join(':')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

router.get('/login', (_req, res) => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    res.redirect(discordAuthUrl)
})

router.get('/callback', async (req, res) => {
    const { code } = req.query
    if (!code) {
        return res.status(400).send('코드가 제공되지 않았습니다.')
    }
    try {
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                scope: scope
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        const accessToken = tokenResponse.data.access_token

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })

        const discordUser = userResponse.data

        await pool.query(
            `INSERT INTO users (discord_id, username, avatar, email)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE username = VALUES(username), avatar = VALUES(avatar), email = VALUES(email)`,
            [discordUser.id, discordUser.username, discordUser.avatar, discordUser.email]
        )

        const payload = JSON.stringify({
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
            avatar: discordUser.avatar
        })
        const encryptedPayload = encrypt(payload)

        res.cookie('session', encryptedPayload, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 
        })

        res.redirect('http://localhost:5173/')
    } catch (error) {
        console.error('디스코드 로그인 실패:', error.response ? error.response.data : error.message)
        res.redirect('http://localhost:5173/?error=login_failed')
    }
})

router.get('/user', async (req, res) => {
    const sessionToken = req.cookies['session']
    if (!sessionToken) {
        return res.status(401).json({ message: 'No session token provided' })
    }

    try {
        const decryptedPayload = decrypt(sessionToken)
        const userData = JSON.parse(decryptedPayload)
        res.json(userData)
    } catch (error) {
        console.error('Error verifying token:', error)
        res.status(401).json({ message: 'Invalid session token' })
    }
})

router.get('/logout', (req, res) => {
    res.clearCookie('session')
    res.redirect('http://localhost:5173/')
})

module.exports = router