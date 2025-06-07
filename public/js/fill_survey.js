// public/js/fill_survey.js
document.addEventListener('DOMContentLoaded', () => {
    const surveyTitleDisplay = document.getElementById('survey-title-display');
    const surveyDescriptionDisplay = document.getElementById('survey-description-display');
    const questionsListContainer = document.getElementById('questions-list-container');
    const fillSurveyForm = document.getElementById('fill-survey-form');
    const submitAnswersBtn = document.getElementById('submit-answers-btn');
    const surveyHeaderSeparator = document.getElementById('survey-header-separator');

    const loadingMessage = document.getElementById('loading-message');
    const errorMessageDiv = document.getElementById('error-message-fill');
    const successMessageDiv = document.getElementById('success-message-fill');
    const surveyDisplayArea = document.getElementById('survey-display-area');

    let currentSurveyId = null; // 用于提交答案时

    // --- Helper: Show/Hide Messages ---
    function hideAllMessages() {
        loadingMessage.style.display = 'none';
        errorMessageDiv.style.display = 'none';
        successMessageDiv.style.display = 'none';
        errorMessageDiv.innerHTML = ''; // Clear previous errors
    }

    function showLoading() {
        hideAllMessages();
        surveyDisplayArea.style.display = 'none'; // Hide form area while loading
        loadingMessage.style.display = 'block';
    }

    function showError(message) {
        hideAllMessages();
        errorMessageDiv.innerHTML = `<p>${message}</p>`;
        errorMessageDiv.style.display = 'block';
        surveyDisplayArea.style.display = 'none'; // Hide form if survey load fails
    }

    function showSuccess() {
        hideAllMessages();
        surveyDisplayArea.style.display = 'none'; // Hide form after successful submission
        successMessageDiv.style.display = 'block';
    }

    function showSurveyForm() {
        hideAllMessages();
        surveyDisplayArea.style.display = 'block';
        submitAnswersBtn.style.display = 'block'; // Show submit button
        surveyHeaderSeparator.style.display = 'block'; // Show separator
    }


    // --- 1. Get share_uuid from URL ---
    const params = new URLSearchParams(window.location.search);
    const shareUuid = params.get('uuid');

    if (!shareUuid) {
        showError("无效的问卷链接：缺少问卷ID。");
        return;
    }

    // --- 2. Fetch Survey Data ---
    async function fetchAndRenderSurvey() {
        showLoading();
        try {
            const response = await fetch(`/api/surveys/fill/${shareUuid}`);
            const result = await response.json();

            if (response.ok && result.success && result.survey) {
                currentSurveyId = result.survey.id; // Store survey ID
                renderSurvey(result.survey);
                showSurveyForm();
            } else {
                showError(result.message || `无法加载问卷 (状态码: ${response.status})。`);
            }
        } catch (error) {
            console.error('Error fetching survey:', error);
            showError('加载问卷失败，请检查您的网络连接或稍后再试。');
        }
    }

    // --- 3. Render Survey ---
    function renderSurvey(survey) {
        surveyTitleDisplay.textContent = survey.title;
        if (survey.description) {
            surveyDescriptionDisplay.textContent = survey.description;
            surveyDescriptionDisplay.style.display = 'block';
        } else {
            surveyDescriptionDisplay.style.display = 'none';
        }
        questionsListContainer.innerHTML = ''; // Clear previous questions

        survey.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-item');
            questionDiv.dataset.questionId = question.id; // Store question ID
            questionDiv.dataset.questionType = question.question_type;
            questionDiv.dataset.isRequired = question.is_required;


            let questionHtml = `<span class="question-text">${index + 1}. ${question.question_text}`;
            if (question.is_required) {
                questionHtml += `<span class="required-indicator">*</span>`;
            }
            questionHtml += `</span><div class="options-group">`;


            switch (question.question_type) {
                case 'text_input':
                    questionHtml += `<textarea name="question_${question.id}" ${question.is_required ? 'required' : ''} placeholder="请输入您的回答"></textarea>`;
                    break;
                case 'single_choice':
                    question.options.forEach(option => {
                        questionHtml += `
                            <label>
                                <input type="radio" name="question_${question.id}" value="${option.id}" ${question.is_required ? 'required' : ''}>
                                ${option.option_text}
                            </label>
                        `;
                    });
                    break;
                case 'multiple_choice':
                    question.options.forEach(option => {
                        questionHtml += `
                            <label>
                                <input type="checkbox" name="question_${question.id}" value="${option.id}">
                                ${option.option_text}
                            </label>
                        `;
                    });
                    // For multiple choice with required, client-side check is a bit more complex
                    // HTML5 'required' on checkbox group doesn't work as intuitively.
                    // We'll handle this in JS validation if needed.
                    if (question.is_required) {
                        // Add a hidden input or a JS check later for "at least one selected"
                        questionDiv.dataset.customRequired = 'true'; // Mark for JS validation
                    }
                    break;
            }
            questionHtml += `</div>`; // Close .options-group
            questionDiv.innerHTML = questionHtml;
            questionsListContainer.appendChild(questionDiv);
        });
    }

    // --- 4. Handle Form Submission ---
    fillSurveyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideAllMessages(); // Hide any previous error/success messages

        submitAnswersBtn.disabled = true;
        submitAnswersBtn.textContent = '提交中...';
        // Pico.css will add aria-busy="true"

        const answersPayload = [];
        const questionItems = questionsListContainer.querySelectorAll('.question-item');
        let formIsValid = true;

        questionItems.forEach(item => {
            const questionId = parseInt(item.dataset.questionId);
            const questionType = item.dataset.questionType;
            const isRequired = item.dataset.isRequired === 'true' || item.dataset.isRequired === '1'; // Convert string/number to boolean
            const customRequired = item.dataset.customRequired === 'true'; // For multiple choice

            let answered = false;

            switch (questionType) {
                case 'text_input':
                    const textarea = item.querySelector(`textarea[name="question_${questionId}"]`);
                    if (textarea.value.trim() !== '') {
                        answersPayload.push({ question_id: questionId, answer_text: textarea.value.trim() });
                        answered = true;
                    }
                    break;
                case 'single_choice':
                    const selectedRadio = item.querySelector(`input[name="question_${questionId}"]:checked`);
                    if (selectedRadio) {
                        answersPayload.push({ question_id: questionId, selected_option_id: parseInt(selectedRadio.value) });
                        answered = true;
                    }
                    break;
                case 'multiple_choice':
                    const checkedBoxes = item.querySelectorAll(`input[name="question_${questionId}"]:checked`);
                    if (checkedBoxes.length > 0) {
                        answered = true; // At least one is checked
                        checkedBoxes.forEach(checkbox => {
                            answersPayload.push({ question_id: questionId, selected_option_id: parseInt(checkbox.value) });
                        });
                    }
                    break;
            }

            if (isRequired && !answered) {
                // For multiple_choice, HTML5 required doesn't work well, so customRequired flag is checked.
                // Or, if it's a standard required field and not answered.
                const questionTextElement = item.querySelector('.question-text');
                const questionText = questionTextElement ? questionTextElement.textContent.split('.')[1].trim() : `问题ID ${questionId}`;
                showError(`问题 "${questionText.replace('*','')}" 是必填项，请回答。`);
                item.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to the invalid question
                formIsValid = false;
                return; // Exit forEach early if one fails (won't stop outer forEach)
            }
        });

        if (!formIsValid) {
            submitAnswersBtn.disabled = false;
            submitAnswersBtn.textContent = '提交问卷';
            // Error message is already shown by the loop
            return;
        }

        if (!currentSurveyId) {
            showError("无法提交：问卷ID丢失。");
            submitAnswersBtn.disabled = false;
            submitAnswersBtn.textContent = '提交问卷';
            return;
        }

        console.log("Submitting answers:", JSON.stringify({ answers: answersPayload }, null, 2));

        try {
            const response = await fetch(`/api/surveys/${currentSurveyId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answersPayload })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                showSuccess();
            } else {
                showError(result.message || `提交失败 (状态码: ${response.status})`);
            }
        } catch (error) {
            console.error('Error submitting answers:', error);
            showError('提交答案失败，请检查您的网络连接或稍后再试。');
        } finally {
            // Don't re-enable button on success, as the form is 'gone'
            if (!successMessageDiv.style.display || successMessageDiv.style.display === 'none') {
                 submitAnswersBtn.disabled = false;
                 submitAnswersBtn.textContent = '提交问卷';
            }
        }
    });


    // --- Initial Load ---
    fetchAndRenderSurvey();
});