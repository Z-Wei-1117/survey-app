// public/js/view_results_access.js
document.addEventListener('DOMContentLoaded', () => {
    const accessCodeForm = document.getElementById('access-code-form');
    const accessCodeInput = document.getElementById('result-access-code-input');
    const accessCodeError = document.getElementById('access-code-error');

    accessCodeForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const accessCode = accessCodeInput.value.trim();

        // Basic client-side validation
        if (!accessCode) {
            accessCodeError.textContent = '结果查看凭证不能为空！';
            accessCodeError.style.display = 'block';
            accessCodeInput.focus();
            accessCodeInput.setAttribute('aria-invalid', 'true');
            return;
        }

        // Optional: more specific format validation (e.g., only numbers, length)
        if (!/^[0-9]+$/.test(accessCode)) {
            accessCodeError.textContent = '凭证只能包含数字！';
            accessCodeError.style.display = 'block';
            accessCodeInput.focus();
            accessCodeInput.setAttribute('aria-invalid', 'true');
            return;
        }

        // If validation passes
        accessCodeError.style.display = 'none';
        accessCodeInput.removeAttribute('aria-invalid');

        // Store the access code in localStorage to pass to the results page
        try {
            localStorage.setItem('surveyResultAccessCode', accessCode);
            // Redirect to the detailed results page
            window.location.href = 'display_results_detailed.html';
        } catch (e) {
            console.error("Error accessing localStorage:", e);
            accessCodeError.textContent = '无法访问本地存储，请检查浏览器设置。';
            accessCodeError.style.display = 'block';
            // Optionally, try to pass via URL parameter as a fallback, though less secure
            // window.location.href = `display_results_detailed.html?code=${encodeURIComponent(accessCode)}`;
        }
    });

    // Clear error on input
    accessCodeInput.addEventListener('input', () => {
        if (accessCodeError.style.display === 'block') {
            accessCodeError.style.display = 'none';
            accessCodeInput.removeAttribute('aria-invalid');
        }
    });
});