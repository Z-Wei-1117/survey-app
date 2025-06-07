// server/routes/surveyRoutes.js
const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController'); // 确保 surveyController.js 文件存在且内容正确

// POST /api/surveys/create - 创建新问卷
router.post('/create', surveyController.createSurvey);

// GET /api/surveys/fill/:share_uuid - 获取问卷供填写
router.get('/fill/:share_uuid', surveyController.getSurveyForFilling); // :share_uuid 是URL参数

// POST /api/surveys/:surveyId/submit - 提交问卷答案
router.post('/:surveyId/submit', surveyController.submitSurveyResponse); // :surveyId 是URL参数

// POST /api/surveys/results-detailed - 获取详细问卷结果
router.post('/results-detailed', surveyController.getSurveyResultsDetailed);

module.exports = router;