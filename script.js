<script>
        // --- 保持原有的 JavaScript 邏輯不變 ---
        const regForm = document.getElementById('registrationForm');
        const resultDiv = document.getElementById('costResult');
        const numAdultsInput = document.getElementById('numAdults');
        const numChildrenInput = document.getElementById('numChildren');
        const numInfantsInput = document.getElementById('numInfants');
        const companionSection = document.getElementById('companionSection');
        const hiddenAdultsInput = document.getElementById('hiddenAdults');
        const hiddenChildrenInput = document.getElementById('hiddenChildren');
        const hiddenInfantsInput = document.getElementById('hiddenInfants');
        const nameInput = document.getElementById('regName');
        const isOutsourcedCheckbox = document.getElementById('isOutsourced');
        const performanceBonusCheckbox = document.getElementById('performanceBonus');
        
        const progressContainer = document.getElementById('progress-container');
        const progressTitle = document.getElementById('progress-title');
        const progressBarFill = document.getElementById('progress-bar-fill');
        const progressText = document.getElementById('progress-text');
        
        let serverHeadcount = 0;
        const scriptURL = 'https://script.google.com/macros/s/AKfycbxbbw0aqiY4zAQs7dsTeHh2KzaeAk5Mr851fcYAnIld20rt3r0Jv4AfJp7ocnn91g8W/exec';

        function generateCompanionFields() {
            const adults = parseInt(numAdultsInput.value) || 0;
            const children = parseInt(numChildrenInput.value) || 0;
            const infants = parseInt(numInfantsInput.value) || 0;
            hiddenAdultsInput.value = adults;
            hiddenChildrenInput.value = children;
            hiddenInfantsInput.value = infants;
            let companionHtml = '';
            
            const createCompanionFieldset = (type, index) => {
                const typeText = { adult: '成人', child: '孩童', infant: '嬰兒' }[type];
                return `
                    <fieldset class="p-4 border border-gray-300/80 rounded-lg">
                        <legend class="px-2 text-md font-semibold text-gray-600">眷屬 (${typeText}) ${index} 資料</legend>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">姓名</label><input type="text" name="${type}_${index}_name" class="form-input" placeholder="請輸入中文姓名" required></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">出生年月日</label><input type="date" name="${type}_${index}_dob" class="form-input" required></div>
                        </div>
                        <div class="mt-4">
                            <label class="inline-flex items-center cursor-pointer"><input type="checkbox" name="${type}_${index}_renew_passport"><span class="ml-3 text-gray-700">需要新辦/換新護照</span></label>
                        </div>
                    </fieldset>`;
            };

            for (let i = 1; i <= adults; i++) { companionHtml += createCompanionFieldset('adult', i); }
            for (let i = 1; i <= children; i++) { companionHtml += createCompanionFieldset('child', i); }
            for (let i = 1; i <= infants; i++) { companionHtml += createCompanionFieldset('infant', i); }
            companionSection.innerHTML = companionHtml;
            regForm.querySelectorAll('#companionSection input').forEach(input => {
                input.addEventListener('change', calculateTotalCost);
            });
        }
        
        function getAge(dateString) {
            if (!dateString) return 99;
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
            return age;
        }

        function handleSpecialConditions() {
            const employeeName = nameInput.value.trim();
            const isOutsourced = isOutsourcedCheckbox.checked;
            const forcedBonusUsers = ['張菲比', '王唯菱', '方成霖'];
            const isForcedBonusUser = forcedBonusUsers.includes(employeeName);
            const isZhang = employeeName === '張仲宇';

            performanceBonusCheckbox.disabled = false;
            if (isForcedBonusUser) {
                performanceBonusCheckbox.checked = true;
                performanceBonusCheckbox.disabled = true;
            } else if (isZhang && isOutsourced) {
                performanceBonusCheckbox.checked = true;
                performanceBonusCheckbox.disabled = true;
            } else if (isOutsourced) {
                performanceBonusCheckbox.checked = false;
                performanceBonusCheckbox.disabled = true;
            }
            calculateTotalCost();
        }

        function updateProgressBar(currentCount) {
            const targetCount = 21;
            const percentage = Math.min((currentCount / targetCount) * 100, 100);
            
            progressContainer.classList.remove('hidden');
            progressTitle.innerText = `目前報名進度 (${currentCount} / ${targetCount} 人)`;
            progressBarFill.style.width = `${percentage}%`;
            progressBarFill.innerText = `${Math.round(percentage)}%`;

            if (currentCount >= targetCount) {
                progressText.innerText = '目標達成！已解鎖全體優惠價！';
                progressText.style.color = '#2f855a'; // Dark Green
            } else {
                const remaining = targetCount - currentCount;
                progressText.innerText = `還差 ${remaining} 人即可解鎖全體優惠價！`;
                progressText.style.color = '#c53030'; // Dark Red
            }
        }

        function calculateTotalCost() {
            const scenarios = {
                planB: { base: 3900, label: "若總人數16-20位" },
                planA: { base: 2900, label: "若總人數>20位" }
            };

            const employeeName = nameInput.value.trim();
            const isLiao = employeeName === '廖彤婕';
            const isZhang = employeeName === '張仲宇';
            const isZhangYiKai = employeeName === '張逸凱';
            const isPhoebe = employeeName === '張菲比';
            const isWeiLing = employeeName === '王唯菱';
            const isChengLin = employeeName === '方成霖';
            const isOutsourced = isOutsourcedCheckbox.checked;
            
            const formAdults = parseInt(numAdultsInput.value) || 0;
            const formChildren = parseInt(numChildrenInput.value) || 0;
            const formTotal = 1 + formAdults + formChildren; 
            const totalHeadcount = serverHeadcount + formTotal;

            let finalHtml = '';
            
            for (const scenarioKey in scenarios) {
                const scenario = scenarios[scenarioKey];
                
                const hasBonusCheckbox = performanceBonusCheckbox.checked;
                const numAdults = parseInt(numAdultsInput.value) || 0;
                const numChildren = parseInt(numChildrenInput.value) || 0;
                const numInfants = parseInt(numInfantsInput.value) || 0;
                const needsSingleRoom = document.getElementById('singleRoom').checked;

                let employeeCompanySubsidy = 30000;
                if (isOutsourced && !isZhang) {
                    employeeCompanySubsidy = 15000;
                }

                const baseEmployeeCost = scenario.base;
                const companionBaseCost = baseEmployeeCost + 30000; 
                const infantCost = 6500;
                const singleRoomSupplement = 9000;
                const adultPassportFee = 1600;
                const childPassportFee = 1200;
                
                let subTotal = 0;
                let passportTotalCost = 0;
                let breakdownHtml = '<div class="text-left text-sm space-y-1 mt-3 text-gray-600">';

                const employeeSelfPay = companionBaseCost - employeeCompanySubsidy;
                subTotal += employeeSelfPay;
                breakdownHtml += `<p>• 員工本人團費：<span class="font-bold text-gray-800">${companionBaseCost.toLocaleString()}</span> 元</p>`;
                breakdownHtml += `<p class="pl-4">└─ 公司補助：<span class="font-bold text-green-600">-${employeeCompanySubsidy.toLocaleString()}</span> 元</p>`;

                if (numAdults > 0) {
                    subTotal += numAdults * companionBaseCost;
                    breakdownHtml += `<p>• 眷屬 (成人 ${numAdults}位)：<span class="font-bold text-gray-800">${(numAdults * companionBaseCost).toLocaleString()}</span> 元</p>`;
                }
                if (numChildren > 0) {
                    subTotal += numChildren * companionBaseCost;
                    breakdownHtml += `<p>• 孩童 (${numChildren}位)：<span class="font-bold text-gray-800">${(numChildren * companionBaseCost).toLocaleString()}</span> 元</p>`;
                }
                if (numInfants > 0) {
                    subTotal += numInfants * infantCost;
                    breakdownHtml += `<p>• 嬰兒 (${numInfants}位)：<span class="font-bold text-gray-800">${(numInfants * infantCost).toLocaleString()}</span> 元</p>`;
                }

                if (numChildren > 0 || hasBonusCheckbox || (isLiao && (numAdults>0 || numChildren>0)) ) {
                     breakdownHtml += `<hr class="border-gray-200 my-2">`;
                     breakdownHtml += `<p class="text-gray-500">折扣與補助：</p>`;
                }

                const standardChildDiscountTotal = 1000 * numChildren;
                if (standardChildDiscountTotal > 0) {
                    subTotal -= standardChildDiscountTotal;
                    breakdownHtml += `<p class="pl-4">└─ 孩童不佔床折扣：<span class="font-bold text-green-600">-${standardChildDiscountTotal.toLocaleString()}</span> 元</p>`;
                }

                if (isLiao) {
                    let specialChildCount = 0;
                    for (let i = 1; i <= numChildren; i++) {
                        const childDob = regForm.querySelector(`[name="child_${i}_dob"]`)?.value;
                        if (getAge(childDob) < 4) { specialChildCount++; }
                    }
                    if (specialChildCount > 0) {
                        const specialChildDiscountTotal = 2500 * specialChildCount;
                        subTotal -= specialChildDiscountTotal;
                        breakdownHtml += `<p class="pl-4 text-yellow-600">└─ ⭐ 彤婕專屬-孩童加碼：<span class="font-bold">-${specialChildDiscountTotal.toLocaleString()}</span> 元</p>`;
                    }
                }
                
                if (numAdults > 0 || numChildren > 0) {
                    if (hasBonusCheckbox) {
                        if (isZhangYiKai) {
                            breakdownHtml += `<p class="pl-4 text-red-500">└─ ⭐ 已將折扣給廖彤婕使用</p>`;
                        } else if (!isOutsourced || isZhang) {
                            const standardBonus = 15000;
                            subTotal -= standardBonus;
                            breakdownHtml += `<p class="pl-4">└─ 業績達標補助：<span class="font-bold text-green-600">-${standardBonus.toLocaleString()}</span> 元</p>`;
                            
                            if (isPhoebe) { breakdownHtml += `<p class="pl-4 text-yellow-600">  (⭐ 上山下海拍影片特別補助)</p>`; } 
                            else if (isWeiLing) { breakdownHtml += `<p class="pl-4 text-yellow-600">  (⭐ 廣告費不給花特別補助)</p>`; }
                            else if (isChengLin) { breakdownHtml += `<p class="pl-4 text-yellow-600">  (⭐ 公司有事沒事特別補助)</p>`; }

                            if (isLiao) {
                                const specialBonus = 5000;
                                subTotal -= specialBonus;
                                breakdownHtml += `<p class="pl-4 text-yellow-600">└─ ⭐ 彤婕專屬-達標加碼：<span class="font-bold">-${specialBonus.toLocaleString()}</span> 元</p>`;
                            }
                        }
                    } else if (isLiao) {
                        const specialBonus = 5000;
                        subTotal -= specialBonus;
                        breakdownHtml += `<p class="pl-4 text-yellow-600">└─ ⭐ 彤婕專屬-特別補助：<span class="font-bold">-${specialBonus.toLocaleString()}</span> 元</p>`;
                    }
                }
                
                const employeeDob = regForm.querySelector('[name="employee_dob"]')?.value;
                if (regForm.querySelector('[name="employee_renew_passport"]')?.checked) {
                    passportTotalCost += (getAge(employeeDob) < 14 ? childPassportFee : adultPassportFee);
                }
                for (let i = 1; i <= numAdults; i++) {
                    if (regForm.querySelector(`[name="adult_${i}_renew_passport"]`)?.checked) {
                        const dob = regForm.querySelector(`[name="adult_${i}_dob"]`)?.value;
                        passportTotalCost += (getAge(dob) < 14 ? childPassportFee : adultPassportFee);
                    }
                }
                for (let i = 1; i <= numChildren; i++) { if (regForm.querySelector(`[name="child_${i}_renew_passport"]`)?.checked) { passportTotalCost += childPassportFee; } }
                for (let i = 1; i <= numInfants; i++) { if (regForm.querySelector(`[name="infant_${i}_renew_passport"]`)?.checked) { passportTotalCost += childPassportFee; } }

                if (needsSingleRoom || passportTotalCost > 0) {
                    breakdownHtml += `<hr class="border-gray-200 my-2">`;
                    breakdownHtml += `<p class="text-gray-500">其他費用：</p>`;
                }
                
                if (needsSingleRoom) {
                    subTotal += singleRoomSupplement;
                    breakdownHtml += `<p class="pl-4">└─ 單人房價差：<span class="font-bold text-gray-800">+${singleRoomSupplement.toLocaleString()}</span> 元</p>`;
                }
                
                if (passportTotalCost > 0) {
                    breakdownHtml += `<p class="pl-4">└─ 護照辦理費：<span class="font-bold text-amber-500">+${passportTotalCost.toLocaleString()}</span> 元</p>`;
                }

                let grandTotal = subTotal + passportTotalCost;
                
                breakdownHtml += '</div>';

                finalHtml += `
                    <div id="plan-${scenarioKey}-card" class="plan-card flex-1 p-4 rounded-lg ${scenarioKey === 'planA' ? 'bg-green-50' : 'bg-yellow-50'}">
                        <p class="font-bold ${scenarioKey === 'planA' ? 'text-green-700' : 'text-yellow-700'}">${scenario.label}費用明細：</p>
                        ${breakdownHtml}
                        <hr class="border-gray-300/50 my-3">
                        <p class="font-bold text-gray-800 text-right">總計：<span class="text-2xl font-black">${grandTotal.toLocaleString()}</span> 元</p>
                    </div>`;
            }
            resultDiv.innerHTML = `<div class="flex flex-col md:flex-row gap-4">${finalHtml}</div>`;
            
            document.getElementById('plan-planA-card')?.classList.toggle('active-plan', totalHeadcount > 20);
            document.getElementById('plan-planB-card')?.classList.toggle('active-plan', totalHeadcount <= 20);
        }
        
        function handleHeadcountResponse(data) {
            if (data && data.status === 'success') {
                serverHeadcount = data.totalCount;
                updateProgressBar(serverHeadcount);
                calculateTotalCost(); 
            } else {
                console.error("Failed to fetch headcount:", data ? data.message : "No data returned");
                progressContainer.classList.remove('hidden');
                progressTitle.innerText = "無法取得即時報名人數";
            }
            const scriptTag = document.getElementById('jsonp-script');
            if (scriptTag) { scriptTag.parentNode.removeChild(scriptTag); }
        }
        
        function fetchHeadcount() {
            const oldScript = document.getElementById('jsonp-script');
            if (oldScript) { oldScript.parentNode.removeChild(oldScript); }
            
            const script = document.createElement('script');
            script.id = 'jsonp-script';
            script.src = scriptURL + "?action=getcount&callback=handleHeadcountResponse&t=" + new Date().getTime(); 
            
            script.onerror = () => {
                console.error("Error fetching headcount: Script load failed.");
                progressContainer.classList.remove('hidden');
                progressTitle.innerText = "無法取得即時報名人數";
                const scriptTag = document.getElementById('jsonp-script');
                if (scriptTag && scriptTag.parentNode) { scriptTag.parentNode.removeChild(scriptTag); }
            };
            
            document.body.appendChild(script);
        }
        
        nameInput.addEventListener('input', handleSpecialConditions);
        isOutsourcedCheckbox.addEventListener('change', handleSpecialConditions);
        numAdultsInput.addEventListener('input', () => { generateCompanionFields(); calculateTotalCost(); });
        numChildrenInput.addEventListener('input', () => { generateCompanionFields(); calculateTotalCost(); });
        numInfantsInput.addEventListener('input', () => { generateCompanionFields(); calculateTotalCost(); });
        
        regForm.addEventListener('change', (event) => {
            const noTriggerIds = ['regName', 'isOutsourced', 'numAdults', 'numChildren', 'numInfants'];
            if (!noTriggerIds.includes(event.target.id)) {
                calculateTotalCost();
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
             generateCompanionFields();
             handleSpecialConditions();
             fetchHeadcount();
        });
        
        const form = document.getElementById('registrationForm');
        const submitBtn = document.getElementById('submitBtn');
        const formStatus = document.getElementById('formStatus');

        form.addEventListener('submit', e => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = '傳送中...';
            formStatus.textContent = '';
            
            fetch(scriptURL, { method: 'POST', body: new FormData(form)})
                .then(response => response.json())
                .then(data => {
                    if(data.result === 'success'){
                        formStatus.innerHTML = `報名成功！<br>請記得將所有人的護照照片 <strong>LINE 給主辦人</strong>。`;
                        formStatus.style.color = 'var(--accent-blue)';
                        form.reset();
                        generateCompanionFields();
                        handleSpecialConditions();
                        fetchHeadcount(); 
                    } else {
                        throw new Error(data.error || 'Unknown error');
                    }
                })
                .catch(error => {
                    formStatus.textContent = '報名失敗，請稍後再試或聯繫主辦人。';
                    formStatus.style.color = '#c53030';
                    console.error('Error!', error.message);
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '送出報名';
                });
        });
        
        const countdownTimerElement = document.getElementById('countdownTimer');
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const deadlineDate = new Date(today);
        deadlineDate.setDate(today.getDate() + daysUntilSunday);
        deadlineDate.setHours(23, 59, 59, 999);

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = deadlineDate.getTime() - now;
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownTimerElement.innerHTML = '<span class="text-xl font-bold text-gray-800">報名已截止！</span>';
                return;
            }
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            countdownTimerElement.innerHTML = `
                <div class="countdown-segment"><span>${d.toString().padStart(2, '0')}</span><span class="countdown-label">天</span></div>
                <div class="countdown-segment"><span>${h.toString().padStart(2, '0')}</span><span class="countdown-label">時</span></div>
                <div class="countdown-segment"><span>${m.toString().padStart(2, '0')}</span><span class="countdown-label">分</span></div>
                <div class="countdown-segment"><span>${s.toString().padStart(2, '0')}</span><span class="countdown-label">秒</span></div>`;
        };
        const countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
    </script>
