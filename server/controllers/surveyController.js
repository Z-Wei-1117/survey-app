// server/controllers/surveyController.js
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { generateUniqueResultCode } = require('../utils/helpers');
const dbConfig = require('../config/db.config');

// API 1: 创建问卷
exports.createSurvey = async (req, res) => {
    const { title, description, questions } = req.body;

    // 1. 基本数据校验 (可以做得更细致)
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "Title and at least one question are required." });
    }
    for (const q of questions) {
        if (!q.question_text || !q.question_type) {
            return res.status(400).json({ success: false, message: "Each question must have text and type." });
        }
        if ((q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && (!q.options || q.options.length < 1)) {
            return res.status(400).json({ success: false, message: `Question '${q.question_text}' must have options.` });
        }
    }

    let connection; // 用于事务
    try {
        const shareUuid = uuidv4();
        const resultCode = await generateUniqueResultCode(); // 生成唯一凭证

        connection = await db.getConnection(); // 从连接池获取连接
        await connection.beginTransaction(); // 开始事务

        // 2. 向 surveys 表插入新问卷记录
        const [surveyResult] = await connection.execute(
            'INSERT INTO surveys (title, description, share_uuid, result_access_code) VALUES (?, ?, ?, ?)',
            [title, description || null, shareUuid, resultCode]
        );
        const surveyId = surveyResult.insertId;

        // 3. 遍历 questions 数组，插入问题和选项
        for (const question of questions) {
            const [questionResult] = await connection.execute(
                'INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order) VALUES (?, ?, ?, ?, ?)',
                [surveyId, question.question_text, question.question_type, question.is_required || false, question.display_order || 0]
            );
            const questionId = questionResult.insertId;

            if ((question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && question.options) {
                for (const option of question.options) {
                    if (!option.option_text) { // 确保选项文本存在
                       await connection.rollback(); // 回滚事务
                      return res.status(400).json({ success: false, message: `Option text is required for question '${question.question_text}'.`});
                    }
                    await connection.execute(
                        'INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)',
                        [questionId, option.option_text, option.display_order || 0]
                    );
                }
            }
        }

        await connection.commit(); // 提交事务

        // 构造分享链接 (这里假设你的应用部署在 localhost:3000，前端页面为 fill_survey.html)
        // 生产环境中需要替换为你的实际域名
        const shareLink = `http://localhost:${dbConfig.APP_PORT}/fill_survey.html?uuid=${shareUuid}`; // 端口后面会配置给Node服务，前端文件会由Nginx或Node服务

        res.status(201).json({
            success: true,
            message: "Survey created successfully!",
            surveyId: surveyId, // 返回surveyId方便调试
            share_link: shareLink,
            result_access_code: resultCode
        });

    } catch (error) {
        if (connection) await connection.rollback(); // 如果出错，回滚事务
        console.error("Error creating survey:", error);
        // 检查是否是由于 generateUniqueResultCode 抛出的错误
        if (error.message === "Failed to generate unique result access code.") {
            return res.status(500).json({ success: false, message: "Failed to generate a unique access code for results. Please try again." });
        }
        res.status(500).json({ success: false, message: "Failed to create survey.", error: error.message });
    } finally {
        if (connection) connection.release(); // 释放连接回连接池
    }
};

// API 2: 获取问卷供填写
exports.getSurveyForFilling = async (req, res) => {
    const { share_uuid } = req.params; // 从URL参数中获取 share_uuid

    if (!share_uuid) {
        return res.status(400).json({ success: false, message: "Share UUID is required." });
    }

    let connection;
    try {
        connection = await db.getConnection();

        // 1. 根据 share_uuid 查询问卷基本信息
        const [surveys] = await connection.execute(
            'SELECT id, title, description FROM surveys WHERE share_uuid = ?',
            [share_uuid]
        );

        if (surveys.length === 0) {
            return res.status(404).json({ success: false, message: "Survey not found." });
        }
        const survey = surveys[0];

        // 2. 根据 survey_id 查询所有问题
        const [questions] = await connection.execute(
            'SELECT id, question_text, question_type, is_required, display_order FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC',
            [survey.id]
        );

        // 3. 为每个问题查询其选项 (如果适用)
        const questionsWithOptions = [];
        for (const question of questions) {
            let options = [];
            if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
                const [opts] = await connection.execute(
                    'SELECT id, option_text, display_order FROM options WHERE question_id = ? ORDER BY display_order ASC, id ASC',
                    [question.id]
                );
                options = opts;
            }
            questionsWithOptions.push({ ...question, options });
        }

        const surveyData = {
            id: survey.id, // 也返回 survey_id，提交答案时会用到
            title: survey.title,
            description: survey.description,
            questions: questionsWithOptions
        };

        res.status(200).json({ success: true, survey: surveyData });

    } catch (error) {
        console.error("Error fetching survey for filling:", error);
        res.status(500).json({ success: false, message: "Failed to fetch survey.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// API 3: 提交问卷答案
exports.submitSurveyResponse = async (req, res) => {
    console.log("--- Received submitSurveyResponse request ---");
    console.log("req.params:", JSON.stringify(req.params, null, 2));
    console.log("req.body:", JSON.stringify(req.body, null, 2)); // 打印完整的请求体

    const { surveyId } = req.params;
    const { answers } = req.body; // 确保这里能正确解构出 answers
    
    console.log("Parsed surveyId:", surveyId, "(type:", typeof surveyId + ")");
    console.log("Parsed answers:", answers, "(type:", typeof answers + ", isArray:", Array.isArray(answers) + ")");


    // 1. 基本数据校验
    if (!surveyId || isNaN(parseInt(surveyId))) {
        console.log("Validation FAILED (submitSurveyResponse): surveyId invalid or missing.");
        return res.status(400).json({ success: false, message: "Valid Survey ID is required." });
    }
    // 检查 req.body 是否为空对象，或者 answers 是否真的不存在或不是数组
    if (!req.body || typeof req.body !== 'object' || req.body === null || !answers || !Array.isArray(answers)) {
        console.log("Validation FAILED (submitSurveyResponse): answers array is missing, not an array, or req.body is problematic.");
        return res.status(400).json({ success: false, message: "Answers array is required in the request body." });
    }

    // 即使 answers 是空数组 []，也应该通过上面的校验，但下面这个循环不会执行
    // 如果 answers 不是数组，上面的校验会捕获

    for (const ans of answers) { // 这个循环只有在 answers 是非空数组时才有意义
        if (ans.question_id === undefined) {
            console.log("Validation FAILED (submitSurveyResponse): an answer is missing question_id.", JSON.stringify(ans, null, 2));
            return res.status(400).json({ success: false, message: "Each answer must have a question_id." });
        }
    }
    console.log("Basic validations PASSED (submitSurveyResponse)");


    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [surveyCheck] = await connection.execute(
            'SELECT id FROM surveys WHERE id = ?',
            [parseInt(surveyId)] // 确保使用数字类型的 surveyId 进行查询
        );
        if (surveyCheck.length === 0) {
            await connection.rollback();
            console.log(`Survey not found for surveyId: ${surveyId}`);
            return res.status(404).json({ success: false, message: "Survey not found." });
        }
        console.log(`Survey ${surveyId} found. Proceeding to insert response.`);

        const [responseResult] = await connection.execute(
            'INSERT INTO responses (survey_id) VALUES (?)',
            [parseInt(surveyId)]
        );
        const responseId = responseResult.insertId;
        console.log(`Response ${responseId} created for survey ${surveyId}.`);

        if (answers.length > 0) {
            for (const answer of answers) {
                await connection.execute(
                    'INSERT INTO answers (response_id, question_id, selected_option_id, answer_text) VALUES (?, ?, ?, ?)',
                    [
                        responseId,
                        answer.question_id, // 确保 answer.question_id 是数字
                        answer.selected_option_id !== undefined ? answer.selected_option_id : null,
                        answer.answer_text !== undefined ? answer.answer_text : null
                    ]
                );
            }
            console.log(`${answers.length} answers inserted for response ${responseId}.`);
        } else {
            console.log(`No answers provided in the request for response ${responseId}.`);
        }

        await connection.commit();
        console.log(`Transaction committed for response ${responseId}.`);

        res.status(201).json({
            success: true,
            message: "Survey response submitted successfully!",
            responseId: responseId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error submitting survey response:", error);
        res.status(500).json({ success: false, message: "Failed to submit survey response.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// server/controllers/surveyController.js
// ... (保留之前的 createSurvey, getSurveyForFilling, submitSurveyResponse 方法 和 require 语句) ...

// API 4: 获取问卷结果 (详细，用于逐份筛选查看)
exports.getSurveyResultsDetailed = async (req, res) => {
    console.log("--- Received getSurveyResultsDetailed request ---");
    console.log("req.body:", JSON.stringify(req.body, null, 2));

    const { result_access_code } = req.body;

    if (!result_access_code) {
        console.log("Validation FAILED (getSurveyResultsDetailed): result_access_code missing.");
        return res.status(400).json({ success: false, message: "Result access code is required." });
    }
    console.log("Basic validations PASSED (getSurveyResultsDetailed)");

    let connection;
    try {
        connection = await db.getConnection();

        // 1. 根据 result_access_code 查询问卷基本信息
        const [surveys] = await connection.execute(
            'SELECT id, title FROM surveys WHERE result_access_code = ?',
            [result_access_code]
        );

        if (surveys.length === 0) {
            console.log(`Survey not found for result_access_code: ${result_access_code}`);
            return res.status(404).json({ success: false, message: "数字凭证不正确或已过期，请检查数字凭证！" });
        }
        const survey = surveys[0]; // survey.id, survey.title
        console.log(`Found survey ${survey.id} ('${survey.title}') for access code.`);

        // 2. 获取问卷结构 (surveyStructure)
        const [questionsFromDB] = await connection.execute(
            'SELECT id, question_text, question_type FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC',
            [survey.id]
        );

        const surveyStructureQuestions = [];
        for (const q of questionsFromDB) {
            const questionStructure = {
                id: q.id,
                text: q.question_text,
                type: q.question_type,
            };
            if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
                const [optionsFromDB] = await connection.execute(
                    'SELECT id, option_text FROM options WHERE question_id = ? ORDER BY display_order ASC, id ASC',
                    [q.id]
                );
                // 前端筛选器只需要选项文本，但我们也可以传递选项ID供参考
                questionStructure.options = optionsFromDB.map(opt => opt.option_text); // 或者 {id: opt.id, text: opt.option_text}
            }
            surveyStructureQuestions.push(questionStructure);
        }
        const surveyStructure = { questions: surveyStructureQuestions };
        console.log(`Survey structure for survey ${survey.id} fetched.`);

        // 3. 获取所有答卷详情 (allResponsesData)
        const [responsesFromDB] = await connection.execute(
            'SELECT id as response_id, submitted_at FROM responses WHERE survey_id = ? ORDER BY submitted_at ASC', // 按提交时间降序排列
            [survey.id]
        );

        const allResponsesData = [];
        for (const resp of responsesFromDB) {
            const [answersFromDB] = await connection.execute(
                `SELECT
                    ans.question_id,
                    q.question_text,
                    q.question_type,
                    ans.answer_text,
                    ans.selected_option_id,
                    opt.option_text AS selected_option_text
                 FROM answers ans
                 JOIN questions q ON ans.question_id = q.id
                 LEFT JOIN options opt ON ans.selected_option_id = opt.id
                 WHERE ans.response_id = ?
                 ORDER BY q.display_order ASC, q.id ASC`, // 确保答案顺序与问题顺序一致
                [resp.response_id]
            );

            const formattedAnswers = answersFromDB.map(ans => {
                // 对于前端逐份展示，我们希望每个答案都有问题文本和答案文本
                return {
                    question_id: ans.question_id,
                    question_text: ans.question_text, // 从联查的 questions 表获取
                    answer_text: ans.question_type === 'text_input' ? ans.answer_text : ans.selected_option_text
                    // 如果是选择题，使用 selected_option_text；如果是文本题，使用 answer_text
                };
            });

            allResponsesData.push({
                response_id: resp.response_id,
                submitted_at: resp.submitted_at,
                answers: formattedAnswers
            });
        }
        console.log(`${allResponsesData.length} responses fetched for survey ${survey.id}.`);

        res.status(200).json({
            success: true,
            surveyTitle: survey.title,
            surveyStructure: surveyStructure,
            allResponses: allResponsesData
        });

    } catch (error) {
        console.error("Error fetching detailed survey results:", error);
        res.status(500).json({ success: false, message: "Failed to fetch survey results.", error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// 其他 controller 方法...
