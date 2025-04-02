const express = require('express')
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')

dotenv.config()
const router = express.Router()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
})

router.get('/posts', async (req, res) => {
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.query(
            'SELECT posts.*, users.avatar, users.discord_id, users.username, tage.tage_name FROM posts JOIN users ON posts.user_id = users.id LEFT JOIN tage ON posts.tage_id = tage.id'
        )
        connection.release()
        res.json(rows)
    } catch (error) {
        console.error('Error fetching blogs:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/posts/:id', async (req, res) => {
    const postId = req.params.id
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.query(
            'SELECT posts.*, users.avatar, users.discord_id, users.name, tage.tage_name FROM posts JOIN users ON posts.user_id = users.id LEFT JOIN tage ON posts.tage_id = tage.id WHERE posts.id = ?',
            [postId]
        )
        connection.release()
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' })
        }
        res.json(rows[0])
    } catch (error) {
        console.error('Error fetching blog:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/tage', async (req, res) => {
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.query('SELECT * FROM tage')
        connection.release()
        res.json(rows)
    } catch (error) {
        console.error('Error fetching tags:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/tage/:id', async (req, res) => {
    const tagId = req.params.id
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.query('SELECT * FROM tage WHERE id = ?', [tagId])
        connection.release()
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tag not found' })
        }
        res.json(rows[0])
    } catch (error) {
        console.error('Error fetching tag:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.get('/posts/tag/:tagId', async (req, res) => {
    const tagId = req.params.tagId
    try {
        const connection = await pool.getConnection()
        const [rows] = await connection.query('SELECT * FROM posts WHERE tag_id = ?', [tagId])
        connection.release()
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No posts found for this tag' })
        }
        res.json(rows)
    } catch (error) {
        console.error('Error fetching posts by tag:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

module.exports = router