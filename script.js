document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    // The frontend config is now much simpler.
    // It only contains the backend URL and the secret key.
    // All calculation logic has been moved to the Google Apps Script backend.
    const CONFIG = {
        scriptURL: 'https://script.google.com/macros/s/AKfycbxbbw0aqiY4zAQs7dsTeHh2KzaeAk5Mr851fcYAnIld20rt3r0Jv4AfJp7ocnn91g8W/exec', // <-- Replace with your new deployment URL if it changed
        secretKey: 'JEJU_TOUR_SECRET_k1s9wz7x_1jo2xlp8qpc', // <-- This key must match the one in your Script Properties
        headcountThreshold: 21,
    };

    // --- DOM ELEMENT CACHE ---
    const dom = {
        regForm: document.getElementById('registrationForm'),
        costResult: document.getElementById('costResult'),
        numAdults: document.getElementById('numAdults'),
        numChildren: document.getElementById('numChildren'),
        numInfants: document.getElementById('numInfants'),
        companionSection: document.getElementById('companionSection'),
        inputs: {
            regName: document.getElementById('regName'),
            isOutsourced: document.getElementById('isOutsourced'),
            performanceBonus: document.getElementById('performanceBonus'),
            singleRoom: document.getElementById('singleRoom'),
        },
        submitBtn: {
            btn: document.getElementById('submitBtn'),
            text: document.getElementById('submitBtnText'),
            spinner: document.getElementById('submitSpinner'),
        },
        formStatus: document.getElementById('formStatus'),
        progress: {
            loader: document.getElementById('progress-loader'),
            content: document.getElementById('progress-content'),
            title: document.getElementById('progress-title'),
            barFill: document.getElementById('progress-bar-fill'),
            text: document.getElementById('progress-text'),
        },
        mobileMenu: {
            button: document.getElementById('mobile-menu-button'),
            menu: document.getElementById('mobile-menu'),
        },
        modal: {
            container: document.getElementById('successModal'),
            content: document.getElementById('modal-content'),
            closeBtn: document.getElementById('closeModalBtn'),
        },
        countdownTimer: document.getElementById('countdownTimer'),
        countdownNotice: document.getElementById('countdown-notice'),
        navLinks: document.querySelectorAll('.nav-link, #mobile-menu a'),
        mainSections: document.querySelectorAll('.main-section'),
        floatingBtn: document.getElementById('floating-signup-btn'),
    };

    let serverHeadcount = 0;

    /**
     * Handles section visibility for single-page navigation.
     * @param {string} targetId The ID of the section to show.
     */
    function showSection(targetId) {
        dom.mainSections.forEach(section => {
            section.classList.toggle('hidden', section.dataset.section !== targetId);
        });
        dom.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === targetId);
        });

        if (dom.floatingBtn) {
            dom.floatingBtn.classList.toggle('hidden', targetId === 'registration');
        }

        dom.mobileMenu.menu.classList.add('hidden');
        window.scrollTo(0, 0);
    }

    /**
     * Generates form fields for companions based on user input.
     */
    function generateCompanionFields() {
        const adults = parseInt(dom.numAdults.value) || 0;
        const children = parseInt(dom.numChildren.value) || 0;
        const infants = parseInt(dom.numInfants.value) || 0;
        document.getElementById('hiddenAdults').value = adults;
        document.getElementById('hiddenChildren').value = children;
        document.getElementById('hiddenInfants').value = infants;

        let html = '';
        const createFieldset = (type, index) => {
            const typeText = { adult: '成人', child: '孩童', infant: '嬰兒' }[type];
            return `<fieldset class="p-4 border border-gray-300 rounded-lg"><legend class="px-2 text-md font-semibold text-gray-800">眷屬 (${typeText}) ${index} 資料</legend><div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2"><div><label class="block text-sm font-medium text-gray-600 mb-1">姓名</label><input type="text" name="${type}_${index}_name" class="form-input" placeholder="請輸入中文姓名" required></div><div><label class="block text-sm font-medium text-gray-600 mb-1">出生年月日</label><input type="date" name="${type}_${index}_dob" class="form-input" required></div></div><div class="mt-4"><label class="inline-flex items-center cursor-pointer"><input type="checkbox" name="${type}_${index}_renew_passport"><span class="ml-3 text-gray-800">需要新辦/換新護照</span></label></div></fieldset>`;
        };
        for (let i = 1; i <= adults; i++) html += createFieldset('adult', i);
        for (let i = 1; i <= children; i++) html += createFieldset('child', i);
        for (let i = 1; i <= infants; i++) html += createFieldset('infant', i);
        dom.companionSection.innerHTML = html;
        attachFormValidationListeners();
    }

    /**
     * Renders a simplified cost estimation.
     * The authoritative calculation is now done on the backend.
     */
    function renderCostEstimate() {
        const adults = parseInt(dom.numAdults.value) || 0;
        const children = parseInt(dom.numChildren.value) || 0;
        const infants = parseInt(dom.numInfants.value) || 0;
        const totalCompanions = adults + children + infants;
        
        if (totalCompanions === 0 && !dom.inputs.regName.value) {
            dom.costResult.innerHTML = `<p class="text-gray-500">請填寫人數與姓名，下方將顯示費用預估。</p>`;
            return;
        }

        // This is a simplified message. The backend now handles the real calculation.
        dom.costResult.innerHTML = `
            <div class="p-4 rounded-lg sub-section-bg" style="background-color: rgba(26, 188, 156, 0.05);">
                <p class="font-bold text-gray-800">費用將於提交後由後端計算</p>
                <p class="text-sm text-gray-600 mt-2">
                    您所填寫的姓名(<strong class="text-teal-600">${dom.inputs.regName.value || '...'}</strong>)、身份(<strong class="text-teal-600">${dom.inputs.isOutsourced.checked ? '外包' : '正式'}</strong>)及眷屬人數(<strong class="text-teal-600">${totalCompanions}</strong> 位)將用於計算最終費用。
                </p>
                <p class="text-xs text-rose-600 mt-3 font-semibold">
                    注意：此處不再顯示詳細費用明細。所有特殊規則、補助及最終金額將在您提交報名後，由系統在後端安全地計算並記錄。
                </p>
            </div>
        `;
    }

    /**
     * Fetches the current total registration count from the server.
     */
    async function fetchHeadcount() {
        dom.progress.loader.classList.remove('hidden');
        dom.progress.content.classList.add('hidden');
        try {
            const url = `${CONFIG.scriptURL}?action=getcount&secret_key=${CONFIG.secretKey}&t=${new Date().getTime()}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data && data.status === 'success') {
                serverHeadcount = data.totalCount;
                updateProgressBar();
            } else {
                throw new Error(data.message || 'Failed to fetch headcount');
            }
        } catch (error) {
            console.error("Error fetching headcount:", error);
            dom.progress.title.innerText = "無法取得即時報名人數";
            dom.progress.text.innerText = "請稍後再試或聯繫主辦人。";
        } finally {
            dom.progress.loader.classList.add('hidden');
            dom.progress.content.classList.remove('hidden');
        }
    }

    /**
     * Updates the registration progress bar UI.
     */
    function updateProgressBar() {
        const target = CONFIG.headcountThreshold;
        const percentage = Math.min((serverHeadcount / target) * 100, 100);
        dom.progress.title.innerText = `目前報名進度 (${serverHeadcount} / ${target} 人)`;
        dom.progress.barFill.style.width = `${percentage}%`;
        dom.progress.barFill.innerText = `${Math.round(percentage)}%`;
        if (serverHeadcount >= target) {
            dom.progress.text.innerText = '目標達成！已解鎖全體優惠價！';
            dom.progress.text.style.color = 'var(--accent-teal)';
        } else {
            dom.progress.text.innerText = `還差 ${target - serverHeadcount} 人即可解鎖全體優惠價！`;
            dom.progress.text.style.color = 'var(--accent-tangerine)';
        }
    }

    /**
     * Handles the form submission process.
     * @param {Event} e The submit event.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitButtonState(true);
        dom.formStatus.textContent = '';

        try {
            const formData = new FormData(dom.regForm);
            // Append the secret key for backend validation
            formData.append('secret_key', CONFIG.secretKey);

            const response = await fetch(CONFIG.scriptURL, { method: 'POST', body: formData });
            const data = await response.json();
            
            if (data.result === 'success') {
                showSuccessModal();
                dom.regForm.reset();
                generateCompanionFields();
                renderCostEstimate();
                await fetchHeadcount(); // Refresh headcount after successful submission
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (error) {
            dom.formStatus.textContent = '報名失敗：' + error.message;
            dom.formStatus.style.color = 'var(--accent-tangerine)';
            console.error('Error!', error.message);
        } finally {
            setSubmitButtonState(false);
        }
    }

    /**
     * Sets the state of the submit button (enabled/disabled/loading).
     * @param {boolean} isSubmitting Whether the form is currently submitting.
     */
    function setSubmitButtonState(isSubmitting) {
        dom.submitBtn.btn.disabled = isSubmitting;
        dom.submitBtn.text.textContent = isSubmitting ? '傳送中...' : '送出報名';
        dom.submitBtn.spinner.classList.toggle('hidden', !isSubmitting);
    }

    /**
     * Validates required form fields before submission.
     * @returns {boolean} True if the form is valid.
     */
    function validateForm() {
        let allValid = true;
        dom.regForm.querySelectorAll('input[required]').forEach(input => {
            const isValid = input.value.trim() !== '';
            input.classList.toggle('invalid-input', !isValid);
            if (!isValid) allValid = false;
        });
        dom.formStatus.textContent = allValid ? '' : '請填寫所有標示為必填的欄位。';
        dom.formStatus.style.color = 'var(--accent-tangerine)';
        return allValid;
    }

    /**
     * Attaches live validation listeners to required inputs.
     */
    function attachFormValidationListeners() {
        dom.regForm.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', (e) => e.target.classList.toggle('invalid-input', e.target.required && !e.target.value.trim()));
            input.addEventListener('input', (e) => e.target.classList.remove('invalid-input'));
        });
    }

    /**
     * Shows the success modal window.
     */
    function showSuccessModal() {
        dom.modal.container.classList.remove('hidden');
        setTimeout(() => dom.modal.content.classList.add('active'), 10);
    }

    /**
     * Hides the success modal window.
     */
    function hideSuccessModal() {
        dom.modal.content.classList.remove('active');
        setTimeout(() => dom.modal.container.classList.add('hidden'), 300);
    }

    /**
     * Updates the countdown timer every second.
     */
    function updateCountdown() {
        const deadlineDate = new Date('2025-06-16T23:59:59'); // Note: The original deadline has passed.
        const now = new Date().getTime();
        const distance = deadlineDate.getTime() - now;

        if (distance < 0) {
            if (countdownInterval) clearInterval(countdownInterval);
            dom.countdownTimer.innerHTML = '<span class="text-xl font-bold text-gray-800">報名已截止！</span>';
            if (dom.countdownNotice) dom.countdownNotice.classList.add('hidden');
            return;
        }
        
        const hoursLeft = distance / (1000 * 60 * 60);
        dom.countdownTimer.classList.toggle('urgent-countdown', hoursLeft > 0 && hoursLeft < 24);

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        dom.countdownTimer.innerHTML = `<div class="countdown-segment"><span>${d.toString().padStart(2, '0')}</span><span class="countdown-label">天</span></div><div class="countdown-segment"><span>${h.toString().padStart(2, '0')}</span><span class="countdown-label">時</span></div><div class="countdown-segment"><span>${m.toString().padStart(2, '0')}</span><span class="countdown-label">分</span></div><div class="countdown-segment"><span>${s.toString().padStart(2, '0')}</span><span class="countdown-label">秒</span></div>`;
    }
    let countdownInterval = null;

    /**
     * Sets up all initial event listeners for the page.
     */
    function setupEventListeners() {
        // Navigation
        dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.dataset.target;
                if (targetId) showSection(targetId);
            });
        });

        // Form changes
        const formInputsForCostRender = [dom.numAdults, dom.numChildren, dom.numInfants, dom.inputs.regName, dom.inputs.isOutsourced];
        formInputsForCostRender.forEach(input => {
            input.addEventListener('input', renderCostEstimate);
        });

        // Companion field generation
        [dom.numAdults, dom.numChildren, dom.numInfants].forEach(input => {
            input.addEventListener('input', generateCompanionFields);
        });

        // Form submission
        dom.regForm.addEventListener('submit', handleFormSubmit);

        // Mobile menu
        dom.mobileMenu.button.addEventListener('click', () => dom.mobileMenu.menu.classList.toggle('hidden'));

        // Modal closing
        dom.modal.closeBtn.addEventListener('click', hideSuccessModal);
        dom.modal.container.addEventListener('click', (e) => {
            if (e.target === dom.modal.container) hideSuccessModal();
        });

        // Floating button
        if (dom.floatingBtn) {
            dom.floatingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showSection('registration');
            });
        }
    }

    /**
     * Initializes the application.
     */
    function init() {
        generateCompanionFields();
        renderCostEstimate();
        fetchHeadcount();
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        setupEventListeners();
        attachFormValidationListeners();
        showSection('summary'); // Show the summary section by default

        // Intersection Observer for fade-in animations
        const animationObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in-up').forEach(el => {
            animationObserver.observe(el);
        });
    }

    init();
});
