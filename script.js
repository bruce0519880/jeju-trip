document.addEventListener('DOMContentLoaded', () => {

    let CONFIG = null;
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbbw0aqiY4zAQs7dsTeHh2KzaeAk5Mr851fcYAnIld20rt3r0Jv4AfJp7ocnn91g8W/exec';
    const SECRET_KEY = 'JEJU_TOUR_SECRET_k1s9wz7x_1jo2xlp8qpc';
    
    let lastActiveSectionId = 'summary';

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
            loadBtn: document.getElementById('loadRecoveredBtn'),
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
            if (section.dataset.section === targetId) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
        dom.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === targetId);
        });
        if (dom.floatingBtn) {
            dom.floatingBtn.classList.toggle('hidden', targetId === 'registration');
        }
        if (dom.mobileMenu.menu && !dom.mobileMenu.menu.classList.contains('hidden')) {
             dom.mobileMenu.menu.classList.add('hidden');
        }
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
        breakdown.base.forEach(item => { html += `<p>• ${item.label}：<span class="font-bold text-gray-800">${item.amount.toLocaleString()}</span> 元</p>`; });
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
            breakdown.extras.forEach(item => { html += `<p>${item.label}<span class="font-bold text-gray-800">+ ${item.amount.toLocaleString()}</span> 元</p>`; });
        }
        html += '</div>';
        return html;
    }

    function renderCostDisplay(costs) {
        if (!costs) {
            dom.costResult.innerHTML = `<p class="text-gray-500">請填寫人數與姓名，下方將顯示費用預估</p>`; return;
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

    function showSuccessModal(registrationId, mode) {
        const h3 = dom.modal.content.querySelector('h3');
        const p = dom.modal.content.querySelector('p');
        const idBlock = dom.modal.content.querySelector('.my-4');
        if (mode === 'update') {
            h3.textContent = '更新成功！';
            p.textContent = '您的報名資料已成功更新。';
            if (idBlock) idBlock.classList.add('hidden');
        } else {
            h3.textContent = '報名成功！';
            p.innerHTML = '請記得將所有人的護照照片<br><strong class="text-[var(--accent-tangerine)]">LINE 給主辦人</strong>，才算完成所有步驟喔！';
            const modalRegistrationIdEl = document.getElementById('modalRegistrationId');
            if (modalRegistrationIdEl && idBlock) {
                modalRegistrationIdEl.textContent = registrationId;
                idBlock.classList.remove('hidden');
            }
        }
        dom.modal.container.classList.remove('hidden');
        setTimeout(() => dom.modal.content.classList.add('active'), 10);
    }

    function hideSuccessModal() {
        const modalRegistrationIdEl = document.getElementById('modalRegistrationId');
        if (modalRegistrationIdEl) modalRegistrationIdEl.textContent = '';
        dom.modal.content.classList.remove('active');
        setTimeout(() => dom.modal.container.classList.add('hidden'), 300);
    }

    async function handleFindRecord(idToFind = null) {
        const id = idToFind || dom.modifyModal.idInput.value.trim();
        if (!id) {
            dom.modifyModal.status.textContent = '請輸入報名ID。';
            return;
        }
        dom.modifyModal.status.textContent = '';
        setFindButtonState(true);
        try {
            const url = `${SCRIPT_URL}?action=getdatabyid&secret_key=${SECRET_KEY}&id=${id}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'success') {
                hideModifyModal();
                hideRecoverModal();
                populateForm(data.rowData);
                formMode = 'update';
                updateRowNumber = data.rowNumber;
                switchToUpdateModeUI();
                showSection('registration');
            } else { throw new Error(data.message); }
        } catch (error) {
            dom.modifyModal.status.textContent = error.message;
        } finally {
            setFindButtonState(false);
        }
    }

    function populateForm(data) {
        originalCompanionCounts = {
            adults: parseInt(data['同行眷屬(成人)']) || 0,
            children: parseInt(data['同行孩童']) || 0,
            infants: parseInt(data['同行嬰兒']) || 0
        };
        dom.numAdults.value = originalCompanionCounts.adults;
        dom.numChildren.value = originalCompanionCounts.children;
        dom.numInfants.value = originalCompanionCounts.infants;
        
        generateCompanionFields();

        dom.inputs.regName.value = data['員工姓名'] || '';
        dom.regForm.querySelector('[name="employee_dob"]').value = data['出生年月日'] || '';
        dom.regForm.querySelector('[name="employee_renew_passport"]').checked = (data['需換護照(員工)'] === 'Y');

        for (let i = 1; i <= originalCompanionCounts.adults; i++) {
            if (dom.regForm.querySelector(`[name="adult_${i}_name"]`)) dom.regForm.querySelector(`[name="adult_${i}_name"]`).value = data[`成人${i}-姓名`] || '';
            if (dom.regForm.querySelector(`[name="adult_${i}_dob"]`)) dom.regForm.querySelector(`[name="adult_${i}_dob"]`).value = data[`成人${i}-出生日期`] || '';
            if (dom.regForm.querySelector(`[name="adult_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="adult_${i}_renew_passport"]`).checked = (data[`成人${i}-需換護照`] === 'Y');
        }
        for (let i = 1; i <= originalCompanionCounts.children; i++) {
            if (dom.regForm.querySelector(`[name="child_${i}_name"]`)) dom.regForm.querySelector(`[name="child_${i}_name"]`).value = data[`孩童${i}-姓名`] || '';
            if (dom.regForm.querySelector(`[name="child_${i}_dob"]`)) dom.regForm.querySelector(`[name="child_${i}_dob"]`).value = data[`孩童${i}-出生日期`] || '';
            if (dom.regForm.querySelector(`[name="child_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="child_${i}_renew_passport"]`).checked = (data[`孩童${i}-需換護照`] === 'Y');
        }
        for (let i = 1; i <= originalCompanionCounts.infants; i++) {
            if (dom.regForm.querySelector(`[name="infant_${i}_name"]`)) dom.regForm.querySelector(`[name="infant_${i}_name"]`).value = data[`嬰兒${i}-姓名`] || '';
            if (dom.regForm.querySelector(`[name="infant_${i}_dob"]`)) dom.regForm.querySelector(`[name="infant_${i}_dob"]`).value = data[`嬰兒${i}-出生日期`] || '';
            if (dom.regForm.querySelector(`[name="infant_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="infant_${i}_renew_passport"]`).checked = (data[`嬰兒${i}-需換護照`] === 'Y');
        }

        dom.inputs.isOutsourced.checked = (data['是否外包'] === 'Y');
        dom.inputs.performanceBonus.checked = (data['業績達標'] === 'Y');
        dom.inputs.singleRoom.checked = (data['需要單人房'] === 'Y');
        
        updateStateFromServer();
    }

    function switchToUpdateModeUI() { dom.submitBtn.text.textContent = '確認修改'; }

    function resetFormToCreateMode() {
        formMode = 'create';
        updateRowNumber = null;
        originalCompanionCounts = null;
        dom.regForm.reset();
        dom.numAdults.min = 0; dom.numChildren.min = 0; dom.numInfants.min = 0;
        generateCompanionFields();
        updateStateFromServer();
    }

    function showModifyModal() {
        dom.modifyModal.container.classList.remove('hidden');
        setTimeout(() => { dom.modifyModal.content.classList.add('active'); dom.modifyModal.idInput.focus(); }, 10);
    }

    function hideModifyModal() {
        dom.modifyModal.idInput.value = ''; dom.modifyModal.status.textContent = '';
        dom.modifyModal.content.classList.remove('active');
        setTimeout(() => { dom.modifyModal.container.classList.add('hidden'); if (formMode === 'update') resetFormToCreateMode(); }, 300);
    }

    function setFindButtonState(isFinding) {
        dom.modifyModal.findBtn.disabled = isFinding;
        dom.modifyModal.findBtnText.textContent = isFinding ? '尋找中...' : '尋找資料';
        dom.modifyModal.findSpinner.classList.toggle('hidden', !isFinding);
    }

    function showRecoverModal() {
        hideModifyModal();
        dom.recoverModal.container.classList.remove('hidden');
        setTimeout(() => { dom.recoverModal.content.classList.add('active'); dom.recoverModal.nameInput.focus(); }, 10);
    }

    function hideRecoverModal() {
        dom.recoverModal.nameInput.value = ''; dom.recoverModal.dobInput.value = ''; dom.recoverModal.status.textContent = '';
        dom.recoverModal.loadBtn.classList.add('hidden');
        dom.recoverModal.recoverBtn.classList.remove('hidden');
        dom.recoverModal.content.classList.remove('active');
        setTimeout(() => dom.recoverModal.container.classList.add('hidden'), 300);
    }

    function setRecoverButtonState(isRecovering) {
        dom.recoverModal.recoverBtn.disabled = isRecovering;
        dom.recoverModal.recoverBtnText.textContent = isRecovering ? '查詢中...' : '找回ID';
        dom.recoverModal.recoverSpinner.classList.toggle('hidden', !isRecovering);
    }

    async function handleRecoverId() {
        const name = dom.recoverModal.nameInput.value.trim();
        const dob = dom.recoverModal.dobInput.value;
        if (!name || !dob) { dom.recoverModal.status.textContent = '請輸入您的姓名與生日。'; return; }
        dom.recoverModal.status.textContent = '';
        dom.recoverModal.loadBtn.classList.add('hidden');
        dom.recoverModal.recoverBtn.classList.remove('hidden');
        setRecoverButtonState(true);
        try {
            const formData = new FormData();
            formData.append('action', 'recoverid');
            formData.append('secret_key', SECRET_KEY);
            formData.append('employee_name', name);
            formData.append('employee_dob', dob);
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.result === 'success') {
                dom.recoverModal.status.innerHTML = `您的報名ID是：<br><strong class="text-lg font-mono">${data.friendlyId}</strong>`;
                dom.recoverModal.loadBtn.dataset.recoveredId = data.friendlyId;
                dom.recoverModal.loadBtn.classList.remove('hidden');
                dom.recoverModal.recoverBtn.classList.add('hidden');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            dom.recoverModal.status.textContent = error.message;
        } finally {
            setRecoverButtonState(false);
        }
    }

    function updateCountdown() {
        const distance = new Date('2025-11-10T14:25:00').getTime() - new Date().getTime();
        if (distance < 0) {
            if (countdownInterval) clearInterval(countdownInterval);
            dom.countdownTimer.innerHTML = '<span class="text-xl font-bold text-gray-800">旅途愉快！</span>';
            if (dom.countdownNotice) dom.countdownNotice.classList.add('hidden'); return;
        }
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        dom.countdownTimer.innerHTML = `<div class="countdown-segment"><span>${d.toString().padStart(2, '0')}</span><span class="countdown-label">天</span></div><div class="countdown-segment"><span>${h.toString().padStart(2, '0')}</span><span class="countdown-label">時</span></div><div class="countdown-segment"><span>${m.toString().padStart(2, '0')}</span><span class="countdown-label">分</span></div><div class="countdown-segment"><span>${s.toString().padStart(2, '0')}</span><span class="countdown-label">秒</span></div>`;
    }
    
    let countdownInterval = null;

    function setFormEnabled(enabled) {
        dom.formFieldsets.forEach(fieldset => { fieldset.disabled = !enabled; });
        dom.submitBtn.btn.disabled = !enabled;
    }

    function attachFormValidationListeners() {
        dom.regForm.addEventListener('input', (e) => {
            const input = e.target;
            if (input.validity.customError) input.setCustomValidity("");
            input.classList.remove('invalid-input');
        });
    }
    
    async function fetchConfig() { const url = `${SCRIPT_URL}?action=getconfig&secret_key=${SECRET_KEY}&t=${new Date().getTime()}`; const response = await fetch(url); if (!response.ok) throw new Error(`無法取得網站設定檔: ${response.status}`); const data = await response.json(); if (data.status === 'success' && data.config) { CONFIG = data.config; } else { throw new Error(data.message || '網站設定檔格式錯誤'); } }
    async function fetchHeadcount() { const url = `${SCRIPT_URL}?action=getcount&secret_key=${SECRET_KEY}&t=${new Date().getTime()}`; const response = await fetch(url); if (!response.ok) throw new Error(`無法取得即時報名人數: ${response.status}`); const data = await response.json(); if (data.status === 'success') { serverHeadcount = data.totalCount; } else { throw new Error(data.message || '取得報名人數失敗'); } }

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
        dom.modal.container.addEventListener('click', (e) => { if (e.target === dom.modal.container) hideSuccessModal(); });
        if(dom.floatingBtn) dom.floatingBtn.addEventListener('click', (e) => { e.preventDefault(); showSection('registration'); });
        
        document.querySelectorAll('.js-show-modify-modal').forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            const activeSection = document.querySelector('.main-section:not(.hidden)');
            if (activeSection) { lastActiveSectionId = activeSection.dataset.section; }
            dom.mobileMenu.menu.classList.add('hidden'); 
            showModifyModal(); 
        }));
        
        dom.modifyModal.closeBtn.addEventListener('click', () => {
            hideModifyModal();
            showSection(lastActiveSectionId);
        });
        dom.modifyModal.container.addEventListener('click', (e) => { 
            if (e.target === dom.modifyModal.container) {
                hideModifyModal();
                showSection(lastActiveSectionId);
            }
        });
        dom.modifyModal.findBtn.addEventListener('click', () => handleFindRecord());

        dom.recoverModal.showBtn.addEventListener('click', showRecoverModal);
        dom.recoverModal.closeBtn.addEventListener('click', hideRecoverModal);
        dom.recoverModal.container.addEventListener('click', (e) => { if (e.target === dom.recoverModal.container) hideRecoverModal(); });
        dom.recoverModal.recoverBtn.addEventListener('click', handleRecoverId);
        
        // [修正] 增加對按鈕是否存在的判斷，讓程式更穩健
        if (dom.recoverModal.loadBtn) {
            dom.recoverModal.loadBtn.addEventListener('click', (e) => {
                const recoveredId = e.currentTarget.dataset.recoveredId;
                if (recoveredId) {
                    handleFindRecord(recoveredId);
                }
            });
        }
    }

    async function init() {
        showSection('summary');
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        setFormEnabled(false);
        dom.progress.loader.classList.remove('hidden');
        dom.progress.content.classList.add('hidden');
        dom.progress.title.innerText = "正在同步最新資訊...";
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
        const animationObserver = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: 0.1 });
        document.querySelectorAll('.fade-in-up').forEach(section => animationObserver.observe(section));
    }

    init();
});
