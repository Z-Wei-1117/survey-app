// public/js/create_survey.js
document.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('create-survey-form');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const submitSurveyBtn = document.getElementById('submit-survey-btn');
    const surveyLinksDiv = document.getElementById('survey-links');
    const shareLinkElem = document.getElementById('share-link');
    const resultCodeElem = document.getElementById('result-code');
    const errorMessageDiv = document.getElementById('error-message');

    let questionCounter = 0;

    // --- Helper Function: Update delete button state for options ---
    function updateOptionDeleteButtonsState(optionsListElement, questionType) {
        const optionItems = optionsListElement.querySelectorAll('li');
        const isChoiceQuestion = (questionType === 'single_choice' || questionType === 'multiple_choice');

        optionItems.forEach((li) => {
            const deleteBtn = li.querySelector('.delete-option-btn');
            if (deleteBtn) {
                if (isChoiceQuestion && optionItems.length <= 1) {
                    deleteBtn.disabled = true;
                } else {
                    deleteBtn.disabled = false;
                }
            }
        });
    }

    // --- Helper Function: Add an option to a question's option list ---
    function addOptionToQuestion(optionsListElement, questionType) {
        const optionLi = document.createElement('li');
        const optionIndex = optionsListElement.children.length + 1;
        optionLi.innerHTML = `
            <input type="text" class="option-text-input" placeholder="选项 ${optionIndex}" required>
            <button type="button" class="delete-option-btn delete-btn" aria-label="删除此选项">删除</button>
        `;
        optionsListElement.appendChild(optionLi);
        updateOptionDeleteButtonsState(optionsListElement, questionType);
    }

    // --- Helper Function: Setup event listeners for a question block ---
    function setupQuestionBlockEventListeners(questionBlock) {
        const typeSelect = questionBlock.querySelector('.question-type-select');
        const optionsContainer = questionBlock.querySelector('.options-container');
        const optionsList = questionBlock.querySelector('.options-list');
        const addOptionBtnInBlock = questionBlock.querySelector('.add-option-btn');
        const deleteQuestionBtn = questionBlock.querySelector('.delete-question-btn');

        typeSelect.addEventListener('change', () => {
            const currentType = typeSelect.value;
            if (currentType === 'single_choice' || currentType === 'multiple_choice') {
                optionsContainer.style.display = 'block';
                if (optionsList.children.length === 0) {
                    addOptionToQuestion(optionsList, currentType);
                } else {
                    updateOptionDeleteButtonsState(optionsList, currentType);
                }
            } else {
                optionsContainer.style.display = 'none';
            }
        });

        if (addOptionBtnInBlock) {
            addOptionBtnInBlock.addEventListener('click', () => {
                addOptionToQuestion(optionsList, typeSelect.value);
            });
        }

        deleteQuestionBtn.addEventListener('click', () => {
            questionBlock.remove();
            updateQuestionNumbers();
        });

        optionsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-option-btn')) {
                const currentType = typeSelect.value;
                if (optionsList.children.length > 1 || (currentType !== 'single_choice' && currentType !== 'multiple_choice')) {
                    event.target.closest('li').remove();
                    updateOptionDeleteButtonsState(optionsList, currentType);
                } else {
                    alert('选择题至少需要一个选项！');
                }
            }
        });
        updateOptionDeleteButtonsState(optionsList, typeSelect.value);
    }

    // --- Helper Function: Update question numbers ---
    function updateQuestionNumbers() {
        const allQuestionBlocks = questionsContainer.querySelectorAll('.question-block');
        allQuestionBlocks.forEach((block, index) => {
            block.querySelector('h4').textContent = `问题 ${index + 1}`;
        });
        questionCounter = allQuestionBlocks.length;
    }

    // --- Event Listener: Add New Question Button ---
    addQuestionBtn.addEventListener('click', () => {
        questionCounter++;
        const questionId = `q${questionCounter}_${Date.now()}`;

        const questionBlock = document.createElement('div');
        questionBlock.classList.add('question-block');
        questionBlock.dataset.questionId = questionId;

        questionBlock.innerHTML = `
            <h4>问题 ${questionCounter}</h4>
            <div> 
                <label for="${questionId}-text">
                    问题文本
                    <input type="text" id="${questionId}-text" class="question-text-input" placeholder="输入问题内容" required>
                </label>
            </div>
            <div>
                <label for="${questionId}-type">
                    问题类型
                    <select id="${questionId}-type" class="question-type-select">
                        <option value="text_input" selected>文本输入</option>
                        <option value="single_choice">单选题</option>
                        <option value="multiple_choice">多选题</option>
                    </select>
                </label>
            </div>
            <fieldset>
                <label for="${questionId}-required">
                    <input type="checkbox" id="${questionId}-required" class="question-required-checkbox" role="switch">
                    是否必填
                </label>
            </fieldset>
            <div class="options-container" style="display: none;">
                <label>选项 (选择题至少一个):</label>
                <ul class="options-list"></ul>
                <button type="button" class="add-option-btn">添加选项</button>
            </div>
            <button type="button" class="delete-question-btn delete-btn" aria-label="删除此问题">删除此问题</button>
        `;
        questionsContainer.appendChild(questionBlock);
        setupQuestionBlockEventListeners(questionBlock);
    });

    // --- Event Listener: Form Submission ---
    surveyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessages();

        submitSurveyBtn.disabled = true;
        submitSurveyBtn.textContent = '创建中...';

        const surveyData = {
            title: document.getElementById('survey-title').value.trim(),
            description: document.getElementById('survey-description').value.trim(),
            questions: []
        };

        const questionBlocks = questionsContainer.querySelectorAll('.question-block');
        if (questionBlocks.length === 0) {
            showError("请至少添加一个问题！");
            submitSurveyBtn.disabled = false;
            submitSurveyBtn.textContent = '创建问卷';
            return;
        }

        let formIsValid = true;
        for (const block of questionBlocks) { // Changed to for...of to allow early exit with 'return' inside if
            const questionText = block.querySelector('.question-text-input').value.trim();
            const questionType = block.querySelector('.question-type-select').value;
            const isRequired = block.querySelector('.question-required-checkbox').checked;

            if (!questionText) {
                showError(`问题 "${block.querySelector('h4').textContent}" 缺少问题文本！`);
                block.querySelector('.question-text-input').focus();
                formIsValid = false;
                break; // Exit for...of loop
            }

            const questionData = {
                question_text: questionText,
                question_type: questionType,
                is_required: isRequired,
                options: []
            };

            if (questionType === 'single_choice' || questionType === 'multiple_choice') {
                const optionInputs = block.querySelectorAll('.options-list .option-text-input');
                if (optionInputs.length === 0) {
                    showError(`问题 "${questionText}" 是选择题，但没有添加任何选项！`);
                    formIsValid = false;
                    break; // Exit for...of loop
                }
                for (const input of optionInputs) { // Changed to for...of
                    const optionText = input.value.trim();
                    if (!optionText) {
                        showError(`问题 "${questionText}" 的某个选项文本为空！`);
                        input.focus();
                        formIsValid = false;
                        break; // Exit inner for...of loop
                    }
                    questionData.options.push({ option_text: optionText });
                }
                if (!formIsValid) break; // Exit outer for...of loop if inner validation failed
            }
            surveyData.questions.push(questionData);
        }


        if (!formIsValid) {
            submitSurveyBtn.disabled = false;
            submitSurveyBtn.textContent = '创建问卷';
            return;
        }

        console.log("Submitting survey data:", JSON.stringify(surveyData, null, 2));

        try {
            const response = await fetch('/api/surveys/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(surveyData)
            });
            const result = await response.json();

            if (response.ok && result.success) {
                showSuccessMessage(result.share_link, result.result_access_code);
                surveyForm.reset();
                questionsContainer.innerHTML = '';
                questionCounter = 0;
                updateQuestionNumbers();
            } else {
                showError(result.message || `创建失败，状态码: ${response.status}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showError('网络错误或服务器连接失败，请稍后再试。');
        } finally {
            submitSurveyBtn.disabled = false;
            submitSurveyBtn.textContent = '创建问卷';
        }
    });

    function hideMessages() {
        surveyLinksDiv.style.display = 'none';
        errorMessageDiv.style.display = 'none';
        errorMessageDiv.innerHTML = '';
    }

    function showError(message) {
        errorMessageDiv.innerHTML = `<p>${message}</p>`;
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.focus();
    }

    function showSuccessMessage(shareLink, resultCode) {
        shareLinkElem.href = shareLink;
        shareLinkElem.textContent = shareLink;
        resultCodeElem.textContent = resultCode;
        surveyLinksDiv.style.display = 'block';
        surveyLinksDiv.focus();
    }

    updateQuestionNumbers();
});