const express = require('express')
const mysql = require('mysql2/promise')
const router = express.Router()
require('dotenv').config()

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
})

router.get('/db', async (req, res) => {
    try {
        const connection = await pool.getConnection()
        connection.release()
        res.send('DB 연결에 성공했습니다!')
    } catch (error) {
        res.status(500).send('DB 연결에 실패했습니다.')
        console.log(error)
    }
})

module.exports = router