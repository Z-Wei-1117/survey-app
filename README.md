# Survey Application (在线调查问卷系统)

这是一个使用 Node.js, Express.js, MySQL 和原生 HTML, CSS, JavaScript 构建的在线调查问卷系统。用户可以创建问卷，分享链接供他人填写，并通过凭证查看问卷结果。结果查看支持筛选和逐份分页。

## 项目特点

*   **轻量级**: 无需复杂的用户注册登录流程。
*   **便捷创建**: 快速定义问卷标题、描述及多种问题类型（单选、多选、文本输入）。
*   **简单分享**: 生成唯一的分享链接和结果查看数字凭证。
*   **结果查看**:
    *   通过数字凭证访问。
    *   支持按单选题选项筛选答卷。
    *   支持逐份分页查看详细答卷内容。
*   **(根据你最终实现的功能添加，例如：链接/凭证3天后自动失效，过期数据清理等)**

## 技术栈

*   **后端**: Node.js, Express.js
*   **数据库**: MySQL
*   **前端**: HTML, CSS, 原生 JavaScript
*   **主要NPM包**:
    *   `express`: Web应用框架
    *   `mysql2`: MySQL驱动 (Promise-based)
    *   `uuid`: 生成唯一ID
    *   `cors`: 处理跨域资源共享
    *   `dotenv`: 加载环境变量

## 项目结构

```text
survey-app/
├── .env.example
├── .gitignore
├── README.md
├── package-lock.json
├── package.json
├── public/                 # 前端静态文件 (HTML, CSS, JS)
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── create_survey.js
│   │   ├── display_results_detailed.js
│   │   ├── fill_survey.js
│   │   └── view_results_access.js
│   ├── create_survey.html
│   ├── display_results_detailed.html
│   ├── fill_survey.html
│   ├── index.html
│   ├── thankyou.html
│   └── view_results_access.html
└── server/                 # 后端代码
    ├── config/
    │   └── db.config.js
    ├── controllers/
    │   └── surveyController.js
    ├── routes/
    │   └── surveyRoutes.js
    ├── utils/
    │   └── helpers.js
    ├── app.js              # Express主应用文件
    └── db.js               # 数据库连接模块

```
## 如何在本地启动项目

### 前提条件

*   **Node.js**: 版本 `22.x` 或更高 (请根据你实际使用的版本填写)。建议使用 [nvm](https://github.com/nvm-sh/nvm) 管理 Node 版本。
*   **MySQL**: 已安装并正在运行。
*   **Git**: 用于克隆仓库。

### 安装步骤

1.  **克隆仓库** (如果你是从GitHub获取项目):
    ```bash
    git clone https://github.com/Z-Wei-1117/survey-app.git
    cd survey-app
    ```
    (如果你已经在本地项目目录，则跳过此步)

2.  **安装后端依赖**:
    在项目根目录下运行：
    ```bash
    npm install
    ```

3.  **配置数据库**:
    *   确保你的本地MySQL服务正在运行。
    *   登录MySQL，创建一个数据库，例如 `survey_db` (或者你本地开发时用的其他名称)。
        ```sql
        CREATE DATABASE survey_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        ```
    *   执行项目所需的建表SQL语句。这些语句通常在项目文档中或可以从开发者处获取。(你可以把我们之前用的建表语句也放到README的一个小节里，或者放在一个单独的 `schema.sql` 文件中并在这里说明如何执行)。
        *例如：你可以将建表SQL语句保存在项目根目录下的 `database_schema.sql` 文件中，然后用户可以通过MySQL客户端导入：*
        ```bash
        # 示例：如果使用mysql命令行客户端
        # mysql -u your_mysql_user -p survey_db < database_schema.sql
        ```

4.  **配置环境变量**:
    *   在项目根目录下，复制 `.env.example` 文件并重命名为 `.env`。
        ```bash
        cp .env.example .env
        ```
    *   打开 `.env` 文件，修改以下配置以匹配你的本地环境：
        ```env
        NODE_ENV=development
        PORT=3001 # 后端API服务器监听的端口

        DB_HOST=localhost
        DB_USER=your_local_mysql_username # 替换为你的本地MySQL用户名
        DB_PASSWORD=your_local_mysql_password # 替换为你的本地MySQL密码
        DB_NAME=survey_db # 替换为你本地创建的数据库名

        APP_BASE_URL=http://localhost:3001 # 本地访问时，前端页面和API同源同端口
        ```

5.  **启动后端开发服务器**:
    在项目根目录下运行：
    ```bash
    npm run dev
    ```
    这通常会使用 `nodemon` 启动服务器，并在文件更改时自动重启。
    你应该会看到类似 "Server is running on port 3001." 的日志。

6.  **访问应用**:
    打开浏览器，访问 `http://localhost:3001` (或者你在 `.env` 中为 `APP_BASE_URL` 配置的相应地址，但由于 `express.static`，通常就是Node服务器监听的地址)。
    你应该能看到应用的首页 (`public/index.html`)。

## API 端点 (简要)

*   `POST /api/surveys/create`: 创建新问卷。
*   `GET /api/surveys/fill/:share_uuid`: 获取问卷供填写。
*   `POST /api/surveys/:surveyId/submit`: 提交问卷答案。
*   `POST /api/surveys/results-detailed`: 获取详细问卷结果。

## (可选) 部署说明

项目已部署到华为云服务器，通过Nginx进行反向代理，PM2管理Node.js进程。
*(这里可以简要说明一下你部署时遇到的关键点或配置，供自己参考)*

## (可选) 未来计划

*   [ ] 添加用户账户系统
*   [ ] 实现更复杂的结果统计图表
*   [ ] ...

## 贡献者

*   Z-Wei-1117

---
