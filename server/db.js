// server/db.js
const mysql = require('mysql2/promise'); // 使用 promise 版本的 mysql2
const dbConfig = require('./config/db.config.js');

// 创建连接池
const pool = mysql.createPool({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    waitForConnections: true,
    connectionLimit: dbConfig.pool.max || 10,
    queueLimit: 0
});

// 测试连接 (可选，但推荐)
pool.getConnection()
    .then(conn => {
        console.log("成功连接到数据库");
        conn.release(); // 释放连接
    })
    .catch(err => {
        console.error("无法连接到数据库:", err);
    });

module.exports = pool; // 导出连接池，方便在其他地方使用