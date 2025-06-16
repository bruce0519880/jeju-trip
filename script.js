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

    function getAge(dateString) {
        if (!dateString) return 99;
        const today = new Date();
        const birthDate = new Date(dateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function handleSpecialConditions() {
        if (!CONFIG) return;
        const employeeName = dom.inputs.regName.value.trim();
        const isOutsourced = dom.inputs.isOutsourced.checked;
        const rule = CONFIG.userRules[employeeName] || {};
        dom.inputs.performanceBonus.disabled = false;
        if (rule.forceBonus) {
            dom.inputs.performanceBonus.checked = true;
            dom.inputs.performanceBonus.disabled = true;
        } else if (isOutsourced && !rule.isOutsourcedSpecial) {
            dom.inputs.performanceBonus.checked = false;
            dom.inputs.performanceBonus.disabled = true;
        }
        renderCost();
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
            dom.progress.text.style.color = 'var(--accent-teal)';
        } else {
            dom.progress.text.innerText = `還差 ${target - serverHeadcount} 人即可解鎖全體優惠價！`;
            dom.progress.text.style.color = 'var(--accent-tangerine)';
        }
    }

    function renderCost() {
        if (!CONFIG) {
            dom.costResult.innerHTML = `<p class="text-gray-500">正在載入最新費用方案...</p>`;
            return;
        }
        const formState = getFormState();
        if ((formState.counts.adults + formState.counts.children + formState.counts.infants) === 0 && !formState.employeeName) {
            dom.costResult.innerHTML = `<p class="text-gray-500">請填寫人數與姓名，下方將顯示費用預估</p>`;
            return;
        }
        let finalHtml = '';
        ['planB', 'planA'].forEach(planKey => {
            const scenario = { ...CONFIG.costs[planKey], label: planKey === 'planA' ? "若總人數>20位" : "若總人數16-20位" };
            const breakdown = calculateBreakdownForScenario(formState, scenario);
            const breakdownHtml = generateBreakdownHtml(breakdown);
            const isActive = (formState.totalHeadcount >= CONFIG.headcountThreshold && planKey === 'planA') || (formState.totalHeadcount < CONFIG.headcountThreshold && planKey === 'planB');
            finalHtml += `<div class="plan-card flex-1 p-4 rounded-lg sub-section-bg ${isActive ? 'active-plan' : ''}" style="background-color: ${planKey === 'planA' ? 'rgba(26, 188, 156, 0.1)' : 'rgba(241, 196, 15, 0.1)'};"><p class="font-bold" style="color: ${planKey === 'planA' ? 'var(--accent-teal)' : '#b5930d'};">${scenario.label}費用明細：</p>${breakdownHtml}<hr class="border-gray-300/50 my-3"><p class="font-bold text-gray-800 text-right">總計：<span class="text-2xl font-black">${breakdown.grandTotal.toLocaleString()}</span> 元</p></div>`;
        });
        dom.costResult.innerHTML = `<div class="flex flex-col md:flex-row gap-4">${finalHtml}</div>`;
    }

    function getFormState() {
        const adults = parseInt(dom.numAdults.value) || 0;
        const children = parseInt(dom.numChildren.value) || 0;
        const infants = parseInt(dom.numInfants.value) || 0;
        let passportRenewals = { adult: 0, child: 0 };
        if (dom.regForm.elements['employee_renew_passport']?.checked) {
            getAge(dom.regForm.elements['employee_dob'].value) < 14 ? passportRenewals.child++ : passportRenewals.adult++;
        }
        let childrenAges = [];
        for (let i = 1; i <= children; i++) {
            if (dom.regForm.elements[`child_${i}_renew_passport`]?.checked) passportRenewals.child++;
            const dob = dom.regForm.elements[`child_${i}_dob`]?.value;
            childrenAges.push(getAge(dob));
        }
        for (let i = 1; i <= adults; i++) {
            if (dom.regForm.elements[`adult_${i}_renew_passport`]?.checked) passportRenewals.adult++;
        }
        for (let i = 1; i <= infants; i++) {
            if (dom.regForm.elements[`infant_${i}_renew_passport`]?.checked) passportRenewals.child++;
        }
        return {
            employeeName: dom.inputs.regName.value.trim(),
            isOutsourced: dom.inputs.isOutsourced.checked,
            hasBonus: dom.inputs.performanceBonus.checked,
            needsSingleRoom: dom.inputs.singleRoom.checked,
            counts: { adults, children, infants },
            passportRenewals: passportRenewals,
            totalHeadcount: serverHeadcount + 1 + adults + children,
            childrenAges: childrenAges,
        };
    }

    function calculateBreakdownForScenario(state, scenario) {
        const rule = CONFIG.userRules[state.employeeName] || {};
        const companionBaseCost = scenario.base + CONFIG.subsidies.company;
        let subTotal = 0;
        let breakdown = { base: [], discounts: [], extras: [], grandTotal: 0 };
        const employeeCompanySubsidy = (state.isOutsourced && !rule.isOutsourcedSpecial) ? CONFIG.subsidies.outsourced : CONFIG.subsidies.company;
        subTotal += (companionBaseCost - employeeCompanySubsidy);
        breakdown.base.push(`• 員工本人團費：<span class="font-bold text-gray-800">${companionBaseCost.toLocaleString()}</span> 元`);
        breakdown.base.push(`<p class="pl-4">└─ 公司補助：<span class="font-bold" style="color: var(--accent-teal);">- ${employeeCompanySubsidy.toLocaleString()}</span> 元</p>`);
        if (state.counts.adults > 0) {
            subTotal += state.counts.adults * companionBaseCost;
            breakdown.base.push(`• 眷屬 (成人 ${state.counts.adults}位)：<span class="font-bold text-gray-800">${(state.counts.adults * companionBaseCost).toLocaleString()}</span> 元`);
        }
        if (state.counts.children > 0) {
            subTotal += state.counts.children * companionBaseCost;
            breakdown.base.push(`• 孩童 (${state.counts.children}位)：<span class="font-bold text-gray-800">${(state.counts.children * companionBaseCost).toLocaleString()}</span> 元`);
        }
        if (state.counts.infants > 0) {
            subTotal += state.counts.infants * CONFIG.costs.infant;
            breakdown.base.push(`• 嬰兒 (${state.counts.infants}位)：<span class="font-bold text-gray-800">${(state.counts.infants * CONFIG.costs.infant).toLocaleString()}</span> 元`);
        }
        let standardChildDiscount = 0;
        let specialChildDiscount = 0;
        if (state.counts.children > 0) {
            state.childrenAges.forEach(age => {
                if (age < 9) {
                    standardChildDiscount += CONFIG.costs.childNoBedDiscount;
                    if (state.employeeName === '廖彤婕' && age < 4) {
                        specialChildDiscount += rule.specialChildDiscount;
                    }
                }
            });
        }
        if (standardChildDiscount > 0) {
            subTotal -= standardChildDiscount;
            breakdown.discounts.push(`<p class="pl-4">└─ 孩童不佔床折扣 (9歲以下)：<span class="font-bold" style="color: var(--accent-teal);">- ${standardChildDiscount.toLocaleString()}</span> 元</p>`);
        }
        if (specialChildDiscount > 0) {
            subTotal -= specialChildDiscount;
            breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">└─ ⭐ 專屬-孩童特別折扣 (4歲以下)：<span class="font-bold">- ${specialChildDiscount.toLocaleString()}</span> 元</p>`);
        }
        if ((state.counts.adults > 0 || state.counts.children > 0) && state.hasBonus) {
            if (rule.bonusRedirect) {
                breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">└─ ⭐ 已將達標補助給 ${rule.bonusRedirectTo} 使用</p>`);
            } else if (!state.isOutsourced || rule.isOutsourcedSpecial) {
                subTotal -= CONFIG.subsidies.performanceBonus;
                breakdown.discounts.push(`<p class="pl-4">└─ 業績達標補助：<span class="font-bold" style="color: var(--accent-teal);">- ${CONFIG.subsidies.performanceBonus.toLocaleString()}</span> 元</p>`);
                if (rule.bonusText) {
                    breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">  (${rule.bonusText})</p>`);
                }
            }
        }
        if (rule.specialBonus && state.hasBonus) {
            subTotal -= rule.specialBonus;
            breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">└─ ⭐ 業績達標-特別補助：<span class="font-bold">- ${rule.specialBonus.toLocaleString()}</span> 元</p>`);
        }
        breakdown.grandTotal = subTotal;
        if (state.needsSingleRoom) {
            breakdown.grandTotal += CONFIG.costs.singleRoomSupplement;
            breakdown.extras.push(`<p class="pl-4">└─ 單人房價差：<span class="font-bold text-gray-800">+ ${CONFIG.costs.singleRoomSupplement.toLocaleString()}</span> 元</p>`);
        }
        const passportTotalCost = (state.passportRenewals.adult * CONFIG.costs.passportAdult) + (state.passportRenewals.child * CONFIG.costs.passportChild);
        if (passportTotalCost > 0) {
            breakdown.grandTotal += passportTotalCost;
            breakdown.extras.push(`<p class="pl-4">└─ 護照辦理費：<span class="font-bold" style="color: var(--accent-sunny-yellow);">+ ${passportTotalCost.toLocaleString()}</span> 元</p>`);
        }
        return breakdown;
    }

    function generateBreakdownHtml(breakdown) {
        let html = '<div class="text-left text-sm space-y-1 mt-3">';
        html += breakdown.base.join('');
        if (breakdown.discounts.length > 0) {
            html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">折扣與補助：</p>${breakdown.discounts.join('')}`;
        }
        if (breakdown.extras.length > 0) {
            html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">其他費用：</p>${breakdown.extras.join('')}`;
        }
        html += '</div>';
        return html;
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
                if (data.mode === 'create') {
                    showSuccessModal(data.registrationId, 'create');
                } else {
                    showSuccessModal(null, 'update');
                }
                resetFormToCreateMode();
                await fetchHeadcount().then(updateProgressBar);
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (error) {
            dom.formStatus.textContent = `操作失敗：${error.message}`;
            dom.formStatus.style.color = 'var(--accent-tangerine)';
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
        if (modalRegistrationIdEl) {
            modalRegistrationIdEl.textContent = '';
        }
        dom.modal.content.classList.remove('active');
        setTimeout(() => dom.modal.container.classList.add('hidden'), 300);
    }

    async function handleFindRecord() {
        const id = dom.modifyModal.idInput.value.trim();
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
                populateForm(data.rowData);
                formMode = 'update';
                updateRowNumber = data.rowNumber;
                switchToUpdateModeUI();
                hideModifyModal();
                showSection('registration');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            dom.modifyModal.status.textContent = error.message;
        } finally {
            setFindButtonState(false);
        }
    }

    function populateForm(data) {
        dom.inputs.regName.value = data['員工姓名'] || '';
        dom.regForm.querySelector('[name="employee_dob"]').value = data['出生年月日'] || '';
        dom.regForm.querySelector('[name="employee_renew_passport"]').checked = (data['需換護照(員工)'] === 'Y');

        dom.numAdults.value = data['同行眷屬(成人)'] || 0;
        dom.numChildren.value = data['同行孩童'] || 0;
        dom.numInfants.value = data['同行嬰兒'] || 0;
        generateCompanionFields();

        setTimeout(() => {
            for(let i = 1; i <= (data['同行眷屬(成人)'] || 0); i++) {
                if(dom.regForm.querySelector(`[name="adult_${i}_name"]`)) dom.regForm.querySelector(`[name="adult_${i}_name"]`).value = data[`成人${i}-姓名`] || '';
                if(dom.regForm.querySelector(`[name="adult_${i}_dob"]`)) dom.regForm.querySelector(`[name="adult_${i}_dob"]`).value = data[`成人${i}-出生日期`] || '';
                if(dom.regForm.querySelector(`[name="adult_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="adult_${i}_renew_passport"]`).checked = (data[`成人${i}-需換護照`] === 'Y');
            }
            for(let i = 1; i <= (data['同行孩童'] || 0); i++) {
                if(dom.regForm.querySelector(`[name="child_${i}_name"]`)) dom.regForm.querySelector(`[name="child_${i}_name"]`).value = data[`孩童${i}-姓名`] || '';
                if(dom.regForm.querySelector(`[name="child_${i}_dob"]`)) dom.regForm.querySelector(`[name="child_${i}_dob"]`).value = data[`孩童${i}-出生日期`] || '';
                if(dom.regForm.querySelector(`[name="child_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="child_${i}_renew_passport"]`).checked = (data[`孩童${i}-需換護照`] === 'Y');
            }
            for(let i = 1; i <= (data['同行嬰兒'] || 0); i++) {
                if(dom.regForm.querySelector(`[name="infant_${i}_name"]`)) dom.regForm.querySelector(`[name="infant_${i}_name"]`).value = data[`嬰兒${i}-姓名`] || '';
                if(dom.regForm.querySelector(`[name="infant_${i}_dob"]`)) dom.regForm.querySelector(`[name="infant_${i}_dob"]`).value = data[`嬰兒${i}-出生日期`] || '';
                if(dom.regForm.querySelector(`[name="infant_${i}_renew_passport"]`)) dom.regForm.querySelector(`[name="infant_${i}_renew_passport"]`).checked = (data[`嬰兒${i}-需換護照`] === 'Y');
            }
        }, 100);

        dom.inputs.isOutsourced.checked = (data['是否外包'] === 'Y');
        dom.inputs.performanceBonus.checked = (data['業績達標'] === 'Y');
        dom.inputs.singleRoom.checked = (data['需要單人房'] === 'Y');
        
        handleSpecialConditions();
        renderCost();
    }
    
    function switchToUpdateModeUI() {
        dom.submitBtn.text.textContent = '確認修改';
    }

    function resetFormToCreateMode() {
        formMode = 'create';
        updateRowNumber = null;
        dom.regForm.reset();
        generateCompanionFields();
        handleSpecialConditions();
        dom.submitBtn.text.textContent = '送出報名';
    }

    function showModifyModal() {
        dom.modifyModal.container.classList.remove('hidden');
        setTimeout(() => dom.modifyModal.content.classList.add('active'), 10);
    }

    function hideModifyModal() {
        dom.modifyModal.idInput.value = '';
        dom.modifyModal.status.textContent = '';
        dom.modifyModal.content.classList.remove('active');
        setTimeout(() => dom.modifyModal.container.classList.add('hidden'), 300);
    }

    function setFindButtonState(isFinding) {
        dom.modifyModal.findBtn.disabled = isFinding;
        dom.modifyModal.findBtnText.textContent = isFinding ? '尋找中...' : '尋找資料';
        dom.modifyModal.findSpinner.classList.toggle('hidden', !isFinding);
    }

    function showRecoverModal() {
        hideModifyModal();
        dom.recoverModal.container.classList.remove('hidden');
        setTimeout(() => dom.recoverModal.content.classList.add('active'), 10);
    }

    function hideRecoverModal() {
        dom.recoverModal.nameInput.value = '';
        dom.recoverModal.dobInput.value = '';
        dom.recoverModal.status.textContent = '';
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

        if (!name || !dob) {
            dom.recoverModal.status.style.color = 'red';
            dom.recoverModal.status.textContent = '請輸入您的姓名與生日。';
            return;
        }
        dom.recoverModal.status.textContent = '';
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
                dom.recoverModal.status.style.color = 'green';
                dom.recoverModal.status.innerHTML = `您的報名ID是：<br><strong class="text-lg font-mono">${data.friendlyId}</strong>`;
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            dom.recoverModal.status.style.color = 'red';
            dom.recoverModal.status.textContent = error.message;
        } finally {
            setRecoverButtonState(false);
        }
    }

    function updateCountdown() {
        const deadlineDate = new Date('2025-06-16T23:59:59');
        const now = new Date().getTime();
        const distance = deadlineDate.getTime() - now;
        const hoursLeft = distance / (1000 * 60 * 60);
        if (hoursLeft > 0 && hoursLeft < 24) {
            dom.countdownTimer.classList.add('urgent-countdown');
        } else {
            dom.countdownTimer.classList.remove('urgent-countdown');
        }
        if (distance < 0) {
            if (countdownInterval) clearInterval(countdownInterval);
            dom.countdownTimer.innerHTML = '<span class="text-xl font-bold text-gray-800">報名已截止！</span>';
            if (dom.countdownNotice) dom.countdownNotice.classList.add('hidden');
            return;
        }
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        dom.countdownTimer.innerHTML = `<div class="countdown-segment"><span>${d.toString().padStart(2, '0')}</span><span class="countdown-label">天</span></div><div class="countdown-segment"><span>${h.toString().padStart(2, '0')}</span><span class="countdown-label">時</span></div><div class="countdown-segment"><span>${m.toString().padStart(2, '0')}</span><span class="countdown-label">分</span></div><div class="countdown-segment"><span>${s.toString().padStart(2, '0')}</span><span class="countdown-label">秒</span></div>`;
    }
    let countdownInterval = null;

    function setFormEnabled(enabled) {
        dom.formFieldsets.forEach(fieldset => {
            fieldset.disabled = !enabled;
        });
        dom.submitBtn.btn.disabled = !enabled;
    }

    function attachFormValidationListeners() {
        dom.regForm.addEventListener('input', (e) => {
            const input = e.target;
            if (input.validity.customError) {
                input.setCustomValidity("");
            }
            input.classList.remove('invalid-input');
        });
        dom.regForm.addEventListener('focusout', (e) => {
            const input = e.target;
            if (!input.hasAttribute('required')) return;
            let isValid = true;
            let errorMessage = "";
            if (input.value.trim() === '') {
                isValid = false;
                errorMessage = "此為必填欄位";
            } else if (input.type === 'date') {
                const selectedDate = new Date(input.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectedDate > today) {
                    isValid = false;
                    errorMessage = "出生日期不能晚於今天";
                }
            }
            if (!isValid) {
                input.setCustomValidity(errorMessage);
                input.classList.add('invalid-input');
            } else {
                input.setCustomValidity("");
                input.classList.remove('invalid-input');
            }
        });
    }
    
    async function fetchConfig() { const url = `${SCRIPT_URL}?action=getconfig&secret_key=${SECRET_KEY}&t=${new Date().getTime()}`; const response = await fetch(url); if (!response.ok) throw new Error(`無法取得網站設定檔: ${response.status}`); const data = await response.json(); if (data.status === 'success' && data.config) { CONFIG = data.config; } else { throw new Error(data.message || '網站設定檔格式錯誤'); } }
    async function fetchHeadcount() { const url = `${SCRIPT_URL}?action=getcount&secret_key=${SECRET_KEY}&t=${new Date().getTime()}`; const response = await fetch(url); if (!response.ok) throw new Error(`無法取得即時報名人數: ${response.status}`); const data = await response.json(); if (data.status === 'success') { serverHeadcount = data.totalCount; } else { throw new Error(data.message || '取得報名人數失敗'); } }
    
    function setupEventListeners() {
        dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.dataset.target;
                if (targetId) {
                    showSection(targetId);
                }
            });
        });
        dom.inputs.regName.addEventListener('input', handleSpecialConditions);
        dom.inputs.isOutsourced.addEventListener('change', handleSpecialConditions);

        const companionInputs = [dom.numAdults, dom.numChildren, dom.numInfants];
        companionInputs.forEach(input => {
            input.addEventListener('input', () => {
                if (CONFIG && CONFIG.companionLimits) {
                    const type = input.id.replace('num', '').toLowerCase();
                    const limit = CONFIG.companionLimits[type];
                    if (parseInt(input.value) > limit) {
                        alert(`抱歉，同行${{ adults: '成人', children: '孩童', infants: '嬰兒' }[type]}人數上限為 ${limit} 位。`);
                        input.value = limit;
                    }
                }
                generateCompanionFields();
                renderCost();
            });
        });

        dom.regForm.addEventListener('change', (event) => {
            if (!['regName', 'isOutsourced', 'numAdults', 'numChildren', 'numInfants'].includes(event.target.id)) {
                renderCost();
            }
        });
        dom.regForm.addEventListener('submit', handleFormSubmit);
        dom.mobileMenu.button.addEventListener('click', () => dom.mobileMenu.menu.classList.toggle('hidden'));
        dom.modal.closeBtn.addEventListener('click', hideSuccessModal);
        dom.modal.container.addEventListener('click', (e) => { if (e.target === dom.modal.container) hideSuccessModal(); });
        if (dom.floatingBtn) {
            dom.floatingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showSection('registration');
            });
        }

        document.querySelectorAll('.js-show-modify-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showModifyModal();
                dom.mobileMenu.menu.classList.add('hidden');
            });
        });

        dom.modifyModal.closeBtn.addEventListener('click', hideModifyModal);
        dom.modifyModal.container.addEventListener('click', (e) => { if (e.target === dom.modifyModal.container) hideModifyModal(); });
        dom.modifyModal.findBtn.addEventListener('click', handleFindRecord);

        dom.recoverModal.showBtn.addEventListener('click', showRecoverModal);
        dom.recoverModal.closeBtn.addEventListener('click', hideRecoverModal);
        dom.recoverModal.container.addEventListener('click', (e) => { if (e.target === dom.recoverModal.container) hideRecoverModal(); });
        dom.recoverModal.recoverBtn.addEventListener('click', handleRecoverId);
    }

    async function init() {
        showSection('summary');
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        setFormEnabled(false); 
        dom.progress.title.innerText = "正在同步最新資訊...";
        dom.progress.loader.classList.remove('hidden');
        dom.progress.content.classList.add('hidden');

        try {
            await Promise.all([fetchConfig(), fetchHeadcount()]);

            setFormEnabled(true);
            updateProgressBar();
            generateCompanionFields();
            handleSpecialConditions();
            setupEventListeners();
            attachFormValidationListeners();

        } catch (error) {
            console.error("初始化失敗:", error);
            dom.progress.loader.classList.add('hidden');
            dom.progress.content.classList.remove('hidden');
            dom.progress.title.innerText = "頁面載入失敗";
            dom.progress.text.innerText = "無法從伺服器取得必要資訊，請稍後再試。";
            dom.progress.text.style.color = 'red';
            setFormEnabled(false);
        }

        const animationObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.fade-in-up').forEach(section => {
            animationObserver.observe(section);
        });
    }

    init();
});
