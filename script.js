document.addEventListener('DOMContentLoaded', () => {

    let CONFIG = null;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbbw0aqiY4zAQs7dsTeHh2KzaeAk5Mr851fcYAnIld20rt3r0Jv4AfJp7ocnn91g8W/exec'; 
    const SECRET_KEY = 'JEJU_TOUR_SECRET_k1s9wz7x_1jo2xlp8qpc';
    
    const dom = {
        regForm: document.getElementById('registrationForm'),
        costResult: document.getElementById('costResult'),
        numAdults: document.getElementById('numAdults'),
        numChildren: document.getElementById('numChildren'),
        numInfants: document.getElementById('numInfants'),
        companionSection: document.getElementById('companionSection'),
        formFieldsets: document.querySelectorAll('#registrationForm fieldset'),
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
        modifyModal: {
            container: document.getElementById('modifyModal'),
            content: document.getElementById('modify-modal-content'),
            closeBtn: document.getElementById('closeModifyModalBtn'),
            idInput: document.getElementById('modifyIdInput'),
            findBtn: document.getElementById('findRecordBtn'),
            findBtnText: document.getElementById('findBtnText'),
            findSpinner: document.getElementById('findSpinner'),
            status: document.getElementById('modifyStatus'),
        },
        recoverModal: {
            container: document.getElementById('recoverModal'),
            content: document.getElementById('recover-modal-content'),
            showBtn: document.getElementById('showRecoverModalBtn'),
            closeBtn: document.getElementById('closeRecoverModalBtn'),
            nameInput: document.getElementById('recoverNameInput'),
            dobInput: document.getElementById('recoverDobInput'),
            recoverBtn: document.getElementById('recoverIdBtn'),
            recoverBtnText: document.getElementById('recoverBtnText'),
            recoverSpinner: document.getElementById('recoverSpinner'),
            status: document.getElementById('recoverStatus'),
        },
        countdownTimer: document.getElementById('countdownTimer'),
        countdownNotice: document.getElementById('countdown-notice'),
        navLinks: document.querySelectorAll('.nav-link, #mobile-menu a'),
        mainSections: document.querySelectorAll('.main-section'),
        floatingBtn: document.getElementById('floating-signup-btn'),
    };

    let serverHeadcount = 0;
    let formMode = 'create';
    let updateRowNumber = null;
    let originalCompanionCounts = null;
    let debounceTimer;

    function showSection(targetId) {
        dom.mainSections.forEach(section => {
            section.style.display = (section.dataset.section === targetId) ? '' : 'none';
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
    
    async function updateStateFromServer() {
        if (!CONFIG) return;
        dom.costResult.innerHTML = `<p class="text-gray-500">正在即時計算費用...</p>`;
        try {
            const formData = new FormData(dom.regForm);
            formData.append('secret_key', SECRET_KEY);
            formData.append('action', 'calculate');
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.result === 'success' && data.state) {
                renderUiState(data.state.uiState);
                renderCostDisplay(data.state.costs);
            } else {
                throw new Error(data.error || '無法從伺服器計算費用');
            }
        } catch (error) {
            dom.costResult.innerHTML = `<p class="text-red-500">費用計算失敗：${error.message}</p>`;
        }
    }

    function renderUiState(uiState) {
        if (!uiState) return;
        const bonusCheckbox = dom.inputs.performanceBonus;
        if (bonusCheckbox) {
            bonusCheckbox.checked = uiState.performanceBonus.checked;
            bonusCheckbox.disabled = uiState.performanceBonus.disabled;
        }
    }

    function generateBreakdownHtml(breakdown) {
        if (!breakdown) return '';
        let html = '<div class="text-left text-sm space-y-1 mt-3">';
        
        breakdown.base.forEach(item => {
            html += `<p>• ${item.label}：<span class="font-bold text-gray-800">${item.amount.toLocaleString()}</span> 元</p>`;
        });

        if (breakdown.discounts.length > 0) {
            html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">折扣與補助：</p>`;
            breakdown.discounts.forEach(item => {
                const color = item.isSpecial ? 'var(--accent-tangerine)' : 'var(--accent-teal)';
                const amountText = item.amount !== 0 ? `<span class="font-bold">${item.amount.toLocaleString()}</span> 元` : '';
                html += `<p style="color: ${color};">${item.label} ${amountText}</p>`;
            });
        }
        
        if (breakdown.extras.length > 0) {
            html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">其他費用：</p>`;
             breakdown.extras.forEach(item => {
                html += `<p>${item.label}<span class="font-bold text-gray-800">+ ${item.amount.toLocaleString()}</span> 元</p>`;
            });
        }
        html += '</div>';
        return html;
    }

    function renderCostDisplay(costs) {
        if (!costs) {
            dom.costResult.innerHTML = `<p class="text-gray-500">請填寫人數與姓名，下方將顯示費用預估</p>`;
            return;
        }
        const totalHeadcount = serverHeadcount + 1 + (parseInt(dom.numAdults.value) || 0) + (parseInt(dom.numChildren.value) || 0);
        let finalHtml = '';
        ['planB', 'planA'].forEach(planKey => {
            const planData = costs[planKey];
            const scenario = CONFIG.costs[planKey];
            const breakdownHtml = generateBreakdownHtml(planData);
            const isActive = (totalHeadcount >= CONFIG.headcountThreshold && planKey === 'planA') || (totalHeadcount < CONFIG.headcountThreshold && planKey === 'planB');
            finalHtml += `<div class="plan-card flex-1 p-4 rounded-lg sub-section-bg ${isActive ? 'active-plan' : ''}" style="background-color: ${planKey === 'planA' ? 'rgba(26, 188, 156, 0.1)' : 'rgba(241, 196, 15, 0.1)'};">
                <p class="font-bold" style="color: ${planKey === 'planA' ? 'var(--accent-teal)' : '#b5930d'};">${scenario.label}費用明細：</p>
                ${breakdownHtml}
                <hr class="border-gray-300/50 my-3">
                <p class="font-bold text-gray-800 text-right">總計：<span class="text-2xl font-black">${planData.grandTotal.toLocaleString()}</span> 元</p>
            </div>`;
        });
        dom.costResult.innerHTML = `<div class="flex flex-col md:flex-row gap-4">${finalHtml}</div><p class="text-xs text-gray-500 mt-2 text-center">注意：此為即時試算結果，已包含所有折扣與補助。護照代辦費將於填寫後計入。</p>`;
    }

    function updateProgressBar() {
        if (!CONFIG) return;
        const target = CONFIG.headcountThreshold;
        const percentage = Math.min((serverHeadcount / target) * 100, 100);
        dom.progress.loader.classList.add('hidden');
        dom.progress.content.classList.remove('hidden');
        dom.progress.title.innerText = `目前報名進度 (${serverHeadcount} / ${target} 人)`;
        dom.progress.barFill.style.width = `${percentage}%`;
        dom.progress.barFill.innerText = `${Math.round(percentage)}%`;
        if (serverHeadcount >= target) {
            dom.progress.text.innerText = '目標達成！已解鎖全體優惠價！';
        } else {
            dom.progress.text.innerText = `還差 ${target - serverHeadcount} 人即可解鎖全體優惠價！`;
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitButtonState(true);
        try {
            const formData = new FormData(dom.regForm);
            formData.append('secret_key', SECRET_KEY);
            if (formMode === 'update' && updateRowNumber) {
                formData.append('action', 'update');
                formData.append('rowNumber', updateRowNumber);
            } else {
                formData.append('action', 'create');
            }
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.result === 'success') {
                showSuccessModal(data.registrationId, data.mode);
                resetFormToCreateMode();
                await fetchHeadcount().then(updateProgressBar);
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (error) {
            dom.formStatus.textContent = `操作失敗：${error.message}`;
            console.error('Error!', error.message);
        } finally {
            setSubmitButtonState(false);
        }
    }

    function setSubmitButtonState(isSubmitting) {
        dom.submitBtn.btn.disabled = isSubmitting;
        dom.submitBtn.text.textContent = isSubmitting ? '傳送中...' : '送出報名';
        dom.submitBtn.spinner.classList.toggle('hidden', !isSubmitting);
    }

    function validateForm() { /* ... */ }
    function showSuccessModal(registrationId, mode) { /* ... */ }
    function hideSuccessModal() { /* ... */ }
    async function handleFindRecord() { /* ... */ }
    function populateForm(data) { /* ... */ }
    function switchToUpdateModeUI() { /* ... */ }
    function resetFormToCreateMode() { /* ... */ }
    function showModifyModal() { /* ... */ }
    function hideModifyModal() { /* ... */ }
    function setFindButtonState(isFinding) { /* ... */ }
    function showRecoverModal() { /* ... */ }
    function hideRecoverModal() { /* ... */ }
    function setRecoverButtonState(isRecovering) { /* ... */ }
    async function handleRecoverId() { /* ... */ }
    function updateCountdown() { /* ... */ }
    let countdownInterval = null;
    function setFormEnabled(enabled) { /* ... */ }
    function attachFormValidationListeners() { /* ... */ }
    async function fetchConfig() { /* ... */ }
    async function fetchHeadcount() { /* ... */ }

    function setupEventListeners() {
        dom.navLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showSection(e.currentTarget.dataset.target); }));
        dom.regForm.addEventListener('change', updateStateFromServer);
        dom.inputs.regName.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateStateFromServer, 300);
        });
        const companionInputs = [dom.numAdults, dom.numChildren, dom.numInfants];
        companionInputs.forEach(input => input.addEventListener('input', () => { generateCompanionFields(); updateStateFromServer(); }));
        dom.regForm.addEventListener('submit', handleFormSubmit);
        dom.mobileMenu.button.addEventListener('click', () => dom.mobileMenu.menu.classList.toggle('hidden'));
        dom.modal.closeBtn.addEventListener('click', hideSuccessModal);
        document.querySelectorAll('.js-show-modify-modal').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); showModifyModal(); }));
        dom.modifyModal.findBtn.addEventListener('click', handleFindRecord);
        dom.recoverModal.showBtn.addEventListener('click', showRecoverModal);
        dom.recoverModal.recoverBtn.addEventListener('click', handleRecoverId);
        // ... and other modal close listeners
    }

    async function init() {
        showSection('summary');
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        setFormEnabled(false); 
        dom.progress.loader.classList.remove('hidden');
        try {
            await Promise.all([fetchConfig(), fetchHeadcount()]);
            setFormEnabled(true);
            updateProgressBar();
            generateCompanionFields();
            setupEventListeners();
            attachFormValidationListeners();
            updateStateFromServer();
        } catch (error) {
            console.error("初始化失敗:", error);
            dom.progress.title.innerText = "頁面載入失敗";
            dom.progress.text.innerText = "無法從伺服器取得必要資訊，請稍後再試。";
        }
        const animationObserver = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); }); }, { threshold: 0.1 });
        document.querySelectorAll('.fade-in-up').forEach(section => animationObserver.observe(section));
    }

    init();
});
