// server/app.js
require('dotenv').config();
const express = require("express");
const path = require("path");
const surveyRoutes = require("./routes/surveyRoutes");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由优先
app.use("/api/surveys", surveyRoutes);
app.get("/api", (req, res) => {
  res.json({ message: "Welcome to Survey App API!" });
});

// 静态文件服务 (应该在API路由之后，在通配符前端路由之前)
app.use(express.static(path.join(__dirname, "../public")));

// 处理所有非 /api 开头的 GET 请求，返回首页 (用于前端 history 路由模式)
app.get(/^\/(?!api).*/, (req, res, next) => {
  const filePath = path.join(__dirname, "../public", "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending index.html:", err.message); // 打印错误信息
      // 避免无限循环或未处理的错误，可以简单地发送404或调用next
      if (!res.headersSent) {
        // 确保响应头还没发送
        res.status(404).send("Resource not found or error serving index.html");
      } else {
        next(err); // 如果头已发送，只能交给错误处理
      }
    }
  });
});

// 可选：一个捕获所有未处理请求的最终404处理（如果上面的路由都没匹配到）
// 这个应该放在所有路由的最后面
app.use((req, res, next) => {
  if (!res.headersSent) {
    res.status(404).json({ message: "Resource not found (catch-all)." });
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(
    `Frontend served from http://localhost:${PORT}/ (if public/index.html exists)`
  );
});
