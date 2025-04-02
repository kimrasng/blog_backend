const express = require('express')
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')
const router = express.Router()

dotenv.config()
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
})

const marked = require('marked')
router.get('/posts/:id', async (req, res) => {
    const postId = req.params.id
    try {
        const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId])
        if (rows.length > 0) {
            const post = rows[0]
            post.content = marked(post.content)
            res.json(post)
        } else {
            res.status(404).send('Post not found')
        }
    } catch (err) {
        console.error(err)
        res.status(500).send('Internal server error')
    }
})

module.exports = router