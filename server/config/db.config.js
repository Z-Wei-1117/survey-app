// server/config/db.config.js
require('dotenv').config(); // 在项目根目录创建 .env 文件，并 npm install dotenv

module.exports = {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME || "survey_db",
    dialect: "mysql",
    pool: { // 连接池配置 (可选)
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    APP_PORT: process.env.APP_PORT || 3001 // 新增：API服务端口，从环境变量读取，默认3001
};