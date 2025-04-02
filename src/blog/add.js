const express = require('express')
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')

const router = express.Router()

dotenv.config()
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
})

const algorithm = 'aes-256-cbc'
const key = crypto.scryptSync(process.env.COOKIE_SECRET, 'salt', 32)

function decrypt(encryptedText) {
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts.shift(), 'hex')
    const encrypted = parts.join(':')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

async function checkUserRole(req, res, next) {
    const sessionToken = req.cookies['session']

    if (!sessionToken) {
        return res.status(401).json({ error: 'Unauthorized: No session token provided' })
    }

    try {
        const decryptedPayload = decrypt(sessionToken)
        const userData = JSON.parse(decryptedPayload)
        // console.log('Decrypted user data:', userData)

        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE discord_id = ?',
            [userData.id]
        )
        
        // console.log('Database query result:', rows)
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized: User not found' })
        }

        const userFromDb = rows[0]
        if (userFromDb.role === 'admin' || userFromDb.role === 'writer') {
            req.user = userFromDb 
            return next() 
        } else {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to create posts' })
        }
    } catch (error) {
        console.error('Error verifying session:', error)
        return res.status(401).json({ error: 'Unauthorized: Invalid session token' })
    }
}

router.post('/', checkUserRole, async (req, res) => {
    const { title, content, tagId, explanation } = req.body
    // console.log('POST /add received:', req.body)

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' })
    }

    try {
        const userId = req.user.id
        console.log('User ID:', userId)

        const [result] = await pool.execute(
            'INSERT INTO posts (title, content, user_id, tage_id, explanation) VALUES (?, ?, ?, ?, ?)',
            [title, content, userId, tagId, explanation]
        )

        res.status(201).json({
            id: result.insertId,
            message: 'Post created successfully'
        })
    } catch (err) {
        console.error('Error creating post:', err)
        res.status(500).json({ error: 'Internal server error' })
    }
})

module.exports = router