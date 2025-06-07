// server/utils/helpers.js
const db = require('../db'); // 引入数据库连接池

// 生成唯一的1-9位数字凭证
async function generateUniqueResultCode() {
    let code;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // 增加尝试次数以防万一

    do {
        if (attempts++ >= MAX_ATTEMPTS) {
            // 实际应用中可能需要更健壮的错误处理或告警
            console.error("多次尝试后无法生成唯一的结果访问代码。");
            throw new Error("无法生成唯一的结果访问代码.");
        }
        // 生成1到9位随机数
        const digits = Math.floor(Math.random() * 9) + 1;
        let min = Math.pow(10, digits - 1);
        if (digits === 1) min = 1; // 确保单数字不是0
        const max = Math.pow(10, digits) - 1;
        code = String(Math.floor(Math.random() * (max - min + 1)) + min);

        // 检查数据库中是否存在该凭证
        const [rows] = await db.execute(
            'SELECT id FROM surveys WHERE result_access_code = ?',
            [code]
        );
        if (rows.length === 0) {
            return code; // 找到唯一凭证
        }
        console.log(`Generated code ${code} already exists. Retrying...`); // 调试信息
    } while (true);
}

module.exports = {
    generateUniqueResultCode
};