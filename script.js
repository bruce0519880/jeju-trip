document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    const CONFIG = {
        scriptURL: 'https://script.google.com/macros/s/AKfycbxbbw0aqiY4zAQs7dsTeHh2KzaeAk5Mr851fcYAnIld20rt3r0Jv4AfJp7ocnn91g8W/exec',
        costs: {
            planB: { base: 3900, label: "若總人數16-20位" },
            planA: { base: 2900, label: "若總人數>20位" },
            infant: 6500,
            singleRoomSupplement: 9000,
            passportAdult: 1600,
            passportChild: 1200,
            childNoBedDiscount: 1000,
        },
        subsidies: {
            company: 30000,
            outsourced: 15000,
            performanceBonus: 15000,
        },
        headcountThreshold: 21,
        userRules: {
            '張菲比': { forceBonus: true, bonusText: '⭐ 上山下海拍影片特別補助' },
            '王唯菱': { forceBonus: true, bonusText: '⭐ 廣告費不給花特別補助' },
            '方成霖': { forceBonus: true, bonusText: '⭐ 公司有事沒事特別補助' },
            '張仲宇': { isOutsourcedSpecial: true },
            '廖彤婕': { specialChildDiscount: 2500, specialBonus: 5000 },
            '張逸凱': { bonusRedirect: true, bonusRedirectTo: '廖彤婕' }
        }
    };

    // =========================================================================
    // DOM Elements
    // =========================================================================
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
    };

    // =========================================================================
    // State
    // =========================================================================
    let serverHeadcount = 0;

    // =========================================================================
    // Functions
    // =========================================================================

    function showSection(targetId) {
        dom.mainSections.forEach(section => {
            section.classList.toggle('hidden', section.dataset.section !== targetId);
        });

        dom.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === targetId);
        });

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
        const birthDate = new Date(dateString);
        return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
    }

    function handleSpecialConditions() {
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
        const formState = getFormState();
        let finalHtml = '';
        ['planB', 'planA'].forEach(planKey => {
            const scenario = CONFIG.costs[planKey];
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
        for (let i = 1; i <= adults; i++) if (dom.regForm.elements[`adult_${i}_renew_passport`]?.checked) passportRenewals.adult++;
        for (let i = 1; i <= children; i++) if (dom.regForm.elements[`child_${i}_renew_passport`]?.checked) passportRenewals.child++;
        for (let i = 1; i <= infants; i++) if (dom.regForm.elements[`infant_${i}_renew_passport`]?.checked) passportRenewals.child++;
        return {
            employeeName: dom.inputs.regName.value.trim(),
            isOutsourced: dom.inputs.isOutsourced.checked,
            hasBonus: dom.inputs.performanceBonus.checked,
            needsSingleRoom: dom.inputs.singleRoom.checked,
            counts: { adults, children, infants },
            passportRenewals: passportRenewals,
            totalHeadcount: serverHeadcount + 1 + adults + children,
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
        if (state.counts.adults > 0) { subTotal += state.counts.adults * companionBaseCost; breakdown.base.push(`• 眷屬 (成人 ${state.counts.adults}位)：<span class="font-bold text-gray-800">${(state.counts.adults * companionBaseCost).toLocaleString()}</span> 元`); }
        if (state.counts.children > 0) { subTotal += state.counts.children * companionBaseCost; breakdown.base.push(`• 孩童 (${state.counts.children}位)：<span class="font-bold text-gray-800">${(state.counts.children * companionBaseCost).toLocaleString()}</span> 元`); }
        if (state.counts.infants > 0) { subTotal += state.counts.infants * CONFIG.costs.infant; breakdown.base.push(`• 嬰兒 (${state.counts.infants}位)：<span class="font-bold text-gray-800">${(state.counts.infants * CONFIG.costs.infant).toLocaleString()}</span> 元`); }
        const childDiscountTotal = CONFIG.costs.childNoBedDiscount * state.counts.children;
        if (childDiscountTotal > 0) { subTotal -= childDiscountTotal; breakdown.discounts.push(`<p class="pl-4">└─ 孩童不佔床折扣：<span class="font-bold" style="color: var(--accent-teal);">- ${childDiscountTotal.toLocaleString()}</span> 元</p>`); }
        if ((state.counts.adults > 0 || state.counts.children > 0) && state.hasBonus) {
            if (rule.bonusRedirect) {
                breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">└─ ⭐ 已將達標補助給 ${rule.bonusRedirectTo} 使用</p>`);
            } else if (!state.isOutsourced || rule.isOutsourcedSpecial) {
                subTotal -= CONFIG.subsidies.performanceBonus;
                breakdown.discounts.push(`<p class="pl-4">└─ 業績達標補助：<span class="font-bold" style="color: var(--accent-teal);">- ${CONFIG.subsidies.performanceBonus.toLocaleString()}</span> 元</p>`);
                if (rule.bonusText) breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">  (${rule.bonusText})</p>`);
            }
        }
        if (rule.specialBonus) { subTotal -= rule.specialBonus; breakdown.discounts.push(`<p class="pl-4" style="color: var(--accent-tangerine);">└─ ⭐ 專屬-特別補助：<span class="font-bold">- ${rule.specialBonus.toLocaleString()}</span> 元</p>`); }
        breakdown.grandTotal = subTotal;
        if (state.needsSingleRoom) { breakdown.grandTotal += CONFIG.costs.singleRoomSupplement; breakdown.extras.push(`<p class="pl-4">└─ 單人房價差：<span class="font-bold text-gray-800">+ ${CONFIG.costs.singleRoomSupplement.toLocaleString()}</span> 元</p>`); }
        const passportTotalCost = (state.passportRenewals.adult * CONFIG.costs.passportAdult) + (state.passportRenewals.child * CONFIG.costs.passportChild);
        if (passportTotalCost > 0) { breakdown.grandTotal += passportTotalCost; breakdown.extras.push(`<p class="pl-4">└─ 護照辦理費：<span class="font-bold" style="color: var(--accent-sunny-yellow);">+ ${passportTotalCost.toLocaleString()}</span> 元</p>`); }
        return breakdown;
    }

    function generateBreakdownHtml(breakdown) {
        let html = '<div class="text-left text-sm space-y-1 mt-3">';
        html += breakdown.base.join('');
        if (breakdown.discounts.length > 0) { html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">折扣與補助：</p>${breakdown.discounts.join('')}`; }
        if (breakdown.extras.length > 0) { html += `<hr class="border-gray-300 my-2"><p class="text-gray-500">其他費用：</p>${breakdown.extras.join('')}`; }
        html += '</div>';
        return html;
    }

    async function fetchHeadcount() {
        dom.progress.loader.classList.remove('hidden');
        dom.progress.content.classList.add('hidden');
        try {
            const response = await fetch(`${CONFIG.scriptURL}?action=getcount&t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data && data.status === 'success') {
                serverHeadcount = data.totalCount;
                updateProgressBar();
                renderCost();
            } else {
                throw new Error(data.message || 'Failed to fetch headcount');
            }
        } catch (error) {
            console.error("Error fetching headcount:", error);
            dom.progress.loader.classList.add('hidden');
            dom.progress.content.classList.remove('hidden');
            dom.progress.title.innerText = "無法取得即時報名人數";
            dom.progress.text.innerText = "請稍後再試或聯繫主辦人。";
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitButtonState(true);
        try {
            const response = await fetch(CONFIG.scriptURL, { method: 'POST', body: new FormData(dom.regForm) });
            const data = await response.json();
            if (data.result === 'success') {
                showSuccessModal();
                dom.regForm.reset();
                generateCompanionFields();
                handleSpecialConditions();
                await fetchHeadcount();
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (error) {
            dom.formStatus.textContent = '報名失敗，請稍後再試或聯繫主辦人。';
            dom.formStatus.style.color = 'var(--accent-tangerine)';
            console.error('Error!', error.message);
        } finally {
            setSubmitButtonState(false);
        }
    }

    // =========================================================================
    // Helper Functions
    // =========================================================================

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

    function attachFormValidationListeners() {
        dom.regForm.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', (e) => e.target.classList.toggle('invalid-input', e.target.required && !e.target.value.trim()));
            input.addEventListener('input', (e) => e.target.classList.remove('invalid-input'));
        });
    }

    function showSuccessModal() {
        dom.modal.container.classList.remove('hidden');
        setTimeout(() => dom.modal.content.classList.add('active'), 10);
    }

    function hideSuccessModal() {
        dom.modal.content.classList.remove('active');
        setTimeout(() => dom.modal.container.classList.add('hidden'), 300);
    }

    function updateCountdown() {
        const deadlineDate = new Date(2025, 5, 16, 23, 59, 59); // 2025年6月16日 23:59:59 (月份是0-indexed, 5代表6月)

        const distance = deadlineDate.getTime() - new Date().getTime();
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

    // =========================================================================
    // Event Listeners
    // =========================================================================
    function setupEventListeners() {
        // Page navigation
        dom.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = e.currentTarget.dataset.target;
                if (targetId) {
                    showSection(targetId);
                }
            });
        });

        // Form logic
        dom.inputs.regName.addEventListener('input', handleSpecialConditions);
        dom.inputs.isOutsourced.addEventListener('change', handleSpecialConditions);
        [dom.numAdults, dom.numChildren, dom.numInfants].forEach(input => {
            input.addEventListener('input', () => {
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

        // Mobile menu toggle
        dom.mobileMenu.button.addEventListener('click', () => dom.mobileMenu.menu.classList.toggle('hidden'));

        // Modal
        dom.modal.closeBtn.addEventListener('click', hideSuccessModal);
        dom.modal.container.addEventListener('click', (e) => {
            if (e.target === dom.modal.container) hideSuccessModal();
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        generateCompanionFields();
        handleSpecialConditions();
        fetchHeadcount();
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        setupEventListeners();
        attachFormValidationListeners();
        showSection('summary'); // Show the summary section by default
    }

    init();
});
