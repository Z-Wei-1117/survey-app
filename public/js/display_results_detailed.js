// public/js/display_results_detailed.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const surveyTitleResults = document.getElementById('survey-title-results');
    const resultsContentArea = document.getElementById('results-content-area');
    // const filterControlsArea = document.getElementById('filters-placeholder'); // No longer needed
    const prevButton = document.getElementById('prev-response');
    const nextButton = document.getElementById('next-response');
    const pageInfoDisplay = document.getElementById('page-info-display');
    const currentResponseArea = document.getElementById('current-response-area');

    const loadingMessageResults = document.getElementById('loading-message-results');
    const errorMessageResults = document.getElementById('error-message-results');

    // --- State Variables ---
    let surveyStructure = null; // To store { questions: [{id, text, type, options?, display_order_in_structure}] }
    let allRawResponses = [];   // To store all fetched responses [{ response_id, answers: [...] }]
    // currentFilteredResponses is no longer needed as a separate variable if no filtering
    let currentResponseIndex = 0;
    // let activeFilters = {}; // No longer needed

    // --- Helper: Show/Hide Messages & Content ---
    function hideAllSections() {
        resultsContentArea.style.display = 'none';
        loadingMessageResults.style.display = 'none';
        errorMessageResults.style.display = 'none';
        errorMessageResults.innerHTML = '';
    }
    function showLoading() {
        hideAllSections();
        loadingMessageResults.style.display = 'block';
    }
    function showError(message) {
        hideAllSections();
        errorMessageResults.innerHTML = `<p>${message}</p>`;
        errorMessageResults.style.display = 'block';
    }
    function showResultsContent() {
        hideAllSections();
        resultsContentArea.style.display = 'block';
    }

    // --- 1. Get Access Code and Fetch Data ---
    async function initializeResultsPage() {
        showLoading();
        const accessCode = localStorage.getItem('surveyResultAccessCode');
        if (!accessCode) {
            showError('未找到结果查看凭证。请从凭证输入页面访问。 <a href="view_results_access.html" role="button">返回凭证输入</a>');
            return;
        }
        try {
            const response = await fetch('/api/surveys/results-detailed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result_access_code: accessCode })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                surveyTitleResults.textContent = result.surveyTitle || '问卷结果';
                // Store original index for sorting answers later
                if (result.surveyStructure && result.surveyStructure.questions) {
                    surveyStructure = {
                        questions: result.surveyStructure.questions.map((q, index) => ({...q, display_order_in_structure: index}))
                    };
                } else {
                    surveyStructure = { questions: [] }; // Ensure it's an empty array if not provided
                }
                allRawResponses = result.allResponses || [];
                currentResponseIndex = 0; // Start with the first response

                if (!surveyStructure.questions || surveyStructure.questions.length === 0) {
                     // Allow showing responses even if structure is minimal, but log a warning
                    console.warn('Survey structure data might be incomplete, but attempting to show responses.');
                }
                 if (allRawResponses.length === 0) {
                    currentResponseArea.innerHTML = '<p class="no-results-message">此问卷还没有任何答卷数据。</p>';
                    pageInfoDisplay.textContent = '第 0 / 0 份';
                    prevButton.disabled = true;
                    nextButton.disabled = true;
                } else {
                    renderCurrentPageResponse();
                }
                showResultsContent();

            } else {
                showError(result.message || `无法加载结果 (状态码: ${response.status})。您可以 <a href="view_results_access.html" role="button">重试</a>。`);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            showError('加载结果失败，请检查网络连接或稍后再试。 <a href="view_results_access.html" role="button">重试</a>');
        }
    }

    // --- Filter related functions are removed ---
    // generateFilterControls() removed
    // countResponsesForFilter() removed
    // handleFilterClick() removed
    // applyFiltersAndRender() removed


    // --- Render Current Page/Response (Modified for multiple_choice display) ---
    function renderCurrentPageResponse() {
        currentResponseArea.innerHTML = '';

        if (allRawResponses.length === 0) { // Check allRawResponses now
            currentResponseArea.innerHTML = '<p class="no-results-message">此问卷还没有任何答卷数据。</p>';
            pageInfoDisplay.textContent = '第 0 / 0 份';
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        if (currentResponseIndex < 0 || currentResponseIndex >= allRawResponses.length) {
            console.warn("currentResponseIndex out of bounds:", currentResponseIndex);
            currentResponseIndex = 0;
             if (allRawResponses.length === 0) {
                 renderCurrentPageResponse();
                 return;
            }
        }

        const responseData = allRawResponses[currentResponseIndex];

        if (!responseData) {
            currentResponseArea.innerHTML = '<p class="no-results-message">无法加载当前答卷数据。</p>';
            pageInfoDisplay.textContent = `第 ${currentResponseIndex + 1} / ${allRawResponses.length} 份`;
            prevButton.disabled = currentResponseIndex <= 0;
            nextButton.disabled = currentResponseIndex >= allRawResponses.length - 1;
            return;
        }

        const respondentHeader = document.createElement('h2');
        respondentHeader.classList.add('respondent-identifier-header');
        let identifier = `答卷${currentResponseIndex + 1}_(提交于: ${new Date(responseData.submitted_at).toLocaleString()})`;
        if (responseData.answers) { // Check if answers exist
            const nameAnswer = responseData.answers.find(ans =>
                (ans.question_text && (ans.question_text.toLowerCase().includes('姓名') || ans.question_text.toLowerCase().includes('name')))
            );
            if (nameAnswer && nameAnswer.answer_text) {
                identifier = `答卷人：${nameAnswer.answer_text} (ID: ${responseData.response_id}, 提交于: ${new Date(responseData.submitted_at).toLocaleString()})`;
            }
        }
        respondentHeader.textContent = identifier;
        currentResponseArea.appendChild(respondentHeader);

        if (responseData.answers && responseData.answers.length > 0) {
            const answersByQuestion = {};

            responseData.answers.forEach(answer => {
                const qId = answer.question_id;
                if (!answersByQuestion[qId]) {
                    const originalQuestion = surveyStructure.questions.find(q => q.id === qId);
                    answersByQuestion[qId] = {
                        question_text: answer.question_text || (originalQuestion ? originalQuestion.text : '未知问题'),
                        question_type: originalQuestion ? originalQuestion.type : 'unknown',
                        answer_texts: [],
                        display_order_in_structure: originalQuestion ? originalQuestion.display_order_in_structure : Infinity
                    };
                }
                if (answer.answer_text !== null && answer.answer_text !== undefined) {
                    answersByQuestion[qId].answer_texts.push(answer.answer_text);
                }
            });

            const sortedGroupedAnswers = Object.values(answersByQuestion).sort((a, b) => a.display_order_in_structure - b.display_order_in_structure);

            sortedGroupedAnswers.forEach((groupedAnswer, index) => { // Use index from sorted array for numbering
                const answerItemDiv = document.createElement('div');
                answerItemDiv.classList.add('answer-item');

                const questionTextSpan = document.createElement('span');
                questionTextSpan.classList.add('question-text-results');
                questionTextSpan.textContent = `${index + 1}. ${groupedAnswer.question_text}:`;

                const answerValueSpan = document.createElement('span');
                answerValueSpan.classList.add('answer-value-results');

                if (groupedAnswer.answer_texts.length > 0) {
                    if (groupedAnswer.question_type === 'multiple_choice') {
                        answerValueSpan.textContent = groupedAnswer.answer_texts.join(', ');
                    } else {
                        answerValueSpan.textContent = groupedAnswer.answer_texts[0];
                    }
                } else {
                    answerValueSpan.textContent = '(未回答)';
                }

                answerItemDiv.appendChild(questionTextSpan);
                answerItemDiv.appendChild(answerValueSpan);
                currentResponseArea.appendChild(answerItemDiv);
            });

        } else {
            const noAnswersP = document.createElement('p');
            noAnswersP.textContent = '此答卷没有回答任何问题。';
            currentResponseArea.appendChild(noAnswersP);
        }

        pageInfoDisplay.textContent = `第 ${currentResponseIndex + 1} / ${allRawResponses.length} 份`;
        prevButton.disabled = currentResponseIndex === 0;
        nextButton.disabled = currentResponseIndex >= allRawResponses.length - 1;
    }

    // --- Pagination Event Listeners ---
    prevButton.addEventListener('click', () => {
        if (currentResponseIndex > 0) {
            currentResponseIndex--;
            renderCurrentPageResponse();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentResponseIndex < allRawResponses.length - 1) {
            currentResponseIndex++;
            renderCurrentPageResponse();
        }
    });

    // --- Initial Load ---
    initializeResultsPage();
});