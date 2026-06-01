// Utility formatters
function formatNumber(n) {
    n = Math.round(n);
    if (n >= 1000000) return (n / 1000000).toFixed(2).replace(/\.00$/, "") + "m";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return n.toLocaleString();
}

function formatNumberCeil(n) {
    if (n >= 1000000) return (Math.ceil(n / 10000) / 100).toFixed(2) + "m";
    if (n >= 1000) return (Math.ceil(n / 10) / 100).toFixed(2) + "k";
    return Math.ceil(n).toLocaleString();
}

function formatK(n) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
}

function formatTime(sec) {
    if (sec === 0) return "0s";
    let d = Math.floor(sec / 86400);
    sec %= 86400;
    let h = Math.floor(sec / 3600);
    sec %= 3600;
    let m = Math.floor(sec / 60);
    sec %= 60;
    let s = Math.floor(sec);

    let parts = [];
    if (d > 0) parts.push(d + "d");
    if (h > 0) parts.push(h + "h");
    if (m > 0) parts.push(m + "m");
    if (s > 0) parts.push(s + "s");

    return parts.slice(0, 2).join(" ");
}

// UI Builders
function buildTierSelectors(containerId, prefix, title, count = 5) {
    let html = `
        <div class="tier-group compact">
            <div class="tier-header">
                <span class="tier-title">${title}</span>
                ${(prefix.includes('Global') || prefix === 'forgeEquipAll') ? '' : `<span class="stat" id="${prefix}Stat">효과 : 0.0%</span>`}
            </div>
            <div class="tier-dots-container">
    `;
    for (let i = 1; i <= count; i++) {
        html += `<div class="tier-row"><span class="t-label">T${i}</span>`;
        html += `<div class="dots" data-prefix="${prefix}" data-tier="${i}" data-level="0">`;
        for (let j = 1; j <= 5; j++) {
            html += `<span class="dot" onclick="handleDotClick('${prefix}', ${i}, ${j})"></span>`;
        }
        html += `</div></div>`;
    }
    html += `</div></div>`;
    document.getElementById(containerId).innerHTML = html;
}

function handleDotClick(prefix, tier, level) {
    let container = document.querySelector(`.dots[data-prefix="${prefix}"][data-tier="${tier}"]`);
    if (!container) return;

    let currentLevel = parseInt(container.getAttribute('data-level')) || 0;
    let newLevel = level;

    // 현재 레벨과 동일한 곳을 클릭하면 0으로 초기화
    if (currentLevel === level) {
        newLevel = 0;
    }

    if (prefix === "forgeEquipAll" || prefix === "forgeGlobal" || prefix === "skillGlobal" || prefix === "petGlobal" || prefix === "mountGlobal") {
        for (let i = 1; i <= 5; i++) {
            let applyLevel = 0;
            if (newLevel === 0) {
                if (i < tier) applyLevel = 5;
                else applyLevel = 0;
            } else {
                if (i < tier) applyLevel = 5;
                else if (i === tier) applyLevel = newLevel;
                else applyLevel = 0;
            }

            updateTierLevel(prefix, i, applyLevel);

            if (prefix === "forgeEquipAll") {
                Data.forgeEquipParts.forEach(p => { updateTierLevel(`forge_${p}`, i, applyLevel); });
            } else {
                let targetPrefixes = [];
                if (prefix === 'forgeGlobal') targetPrefixes = Data.forgeCategories.map(c => `forge_${c.key}`);
                else if (prefix === 'skillGlobal') targetPrefixes = ['skill_cost'];
                else if (prefix === 'petGlobal') targetPrefixes = ['pet_bonus'];
                else if (prefix === 'mountGlobal') targetPrefixes = ['mount_cost', 'mount_bonus'];

                targetPrefixes.forEach(tp => { updateTierLevel(tp, i, applyLevel); });
            }
        }
    } else {
        updateTierLevel(prefix, tier, newLevel);
    }

    triggerCalculate();
}

function updateTierLevel(prefix, tier, level) {
    let containers = document.querySelectorAll(`.dots[data-prefix="${prefix}"][data-tier="${tier}"]`);
    containers.forEach(container => {
        container.setAttribute('data-level', level);
        let dots = container.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx < level) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    });
}

function getTierLevel(prefix, tier) {
    let container = document.querySelector(`.dots[data-prefix="${prefix}"][data-tier="${tier}"]`);
    if (!container) return 0;
    return parseInt(container.getAttribute('data-level')) || 0;
}

function getTotalTier(prefix) {
    let sum = 0;
    for (let i = 1; i <= 5; i++) {
        sum += getTierLevel(prefix, i);
    }
    return sum;
}

function setGlobalTier(pagePrefix, maxTier) {
    let prefixes = [];
    if (pagePrefix === 'forge') prefixes = Data.forgeCategories.map(c => `forge_${c.key}`);
    else if (pagePrefix === 'skill') prefixes = ['skill_cost'];
    else if (pagePrefix === 'pet') prefixes = ['pet_bonus'];
    else if (pagePrefix === 'mount') prefixes = ['mount_cost', 'mount_bonus'];

    prefixes.forEach(prefix => {
        for (let i = 1; i <= 5; i++) {
            if (maxTier === 0) {
                updateTierLevel(prefix, i, 0);
            } else {
                if (i <= maxTier) updateTierLevel(prefix, i, 5);
                else updateTierLevel(prefix, i, 0);
            }
        }
    });

    triggerCalculate();
}

function triggerCalculate() {
    calcForge('forge');
    calcSkill('skill');
    calcPet('pet');
    calcMount('mount');
    ['forge', 'skill', 'pet', 'mount'].forEach(cat => {
        runSimulator(cat, cat);
    });
}

// Navigation
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(pageId).classList.add('active');
    document.querySelector(`.nav-btn[onclick="switchPage('${pageId}')"]`).classList.add('active');
}

// Combined Simulator UI Builder
function buildCombinedSimulatorUI(containerId, titlePrefix, prefix, maxLevel, currencyLabel) {
    let cat = prefix;
    let grades = [];
    if (cat === 'forge') {
        grades = [
            { n: '원시', c: 'var(--color-primitive)' },
            { n: '중세', c: 'var(--color-medieval)' },
            { n: '근대', c: 'var(--color-earlymodern)' },
            { n: '현대', c: 'var(--color-modern)' },
            { n: '우주', c: 'var(--color-space)' },
            { n: '항성', c: 'var(--color-interstellar)' },
            { n: '다중', c: 'var(--color-multiverse)' },
            { n: '양자', c: 'var(--color-quantum)' },
            { n: '지하', c: 'var(--color-underworld)' },
            { n: '신성', c: 'var(--color-divine)' }
        ];
    } else {
        grades = [
            { n: '일반', c: 'var(--color-common)' },
            { n: '희귀', c: 'var(--color-rare)' },
            { n: '서사', c: 'var(--color-epic)' },
            { n: '전설', c: 'var(--color-legendary)' },
            { n: '궁극', c: 'var(--color-ultimate)' },
            { n: '신화', c: 'var(--color-mythic)' }
        ];
    }

    let unlocks = new Array(grades.length).fill(0);
    if (Data[cat]) {
        Data[cat].forEach(row => {
            row.probs.forEach((p, idx) => {
                if (p > 0 && unlocks[idx] === 0) unlocks[idx] = row.level;
            });
        });
    }

    let quickBtns = '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-top: 5px;">';
    unlocks.forEach((lvl, idx) => {
        if (lvl > 0 && lvl !== 1) { // Skip default level 1
            quickBtns += `<button class="g-btn" style="padding: 6px 12px; font-size: 13px; font-weight: bold; min-width: 60px; height: auto; background: rgba(0,0,0,0.5); border: 1px solid ${grades[idx].c}; color: ${grades[idx].c};" onclick="document.getElementById('${prefix}_tarLvl').value=${lvl}; syncLvl('${prefix}_tar', ${lvl}); triggerCalculate();">${grades[idx].n}</button>`;
        }
    });
    quickBtns += '</div>';

    let html = `
        <h2 style="color: var(--neon-cyan); border-bottom: 1px solid rgba(0, 229, 255, 0.3); padding-bottom: 10px; margin-top: 0; margin-bottom: 20px;">${titlePrefix} 예측 시뮬레이터</h2>
        
        <!-- 예측 시뮬레이터 (첫 번째 행) -->
        <div style="display: flex; gap: 20px; margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px dashed rgba(255,255,255,0.15);">
            <!-- 좌측 컬럼 (예측 입력) -->
            <div style="flex: 1; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 20px;">
                <h3 style="margin: 0; font-size: 15px; color: var(--neon-cyan); margin-bottom: 12px;">현재 보유재화 시뮬레이터</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-muted); min-width: 60px;">현재 승천:</span>
                        <div class="asc-chips" id="${prefix}_curAscChips" style="margin-bottom: 0; flex: 1;">
                            <span class="asc-chip active" onclick="setAsc('${prefix}_cur', 0)" style="padding: 4px 0; font-size: 13px;">0</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_cur', 1)" style="padding: 4px 0; font-size: 13px;">1</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_cur', 2)" style="padding: 4px 0; font-size: 13px;">2</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_cur', 3)" style="padding: 4px 0; font-size: 13px;">3</span>
                        </div>
                        <input type="hidden" id="${prefix}_curAsc" value="0">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-muted); min-width: 60px;">현재 레벨:</span>
                        <div class="lvl-control" style="margin: 0; flex: 1;">
                            <input type="range" class="lvl-slider" id="${prefix}_curLvlSlider" min="1" max="${maxLevel}" value="1" oninput="syncLvl('${prefix}_cur', this.value)" style="height: 4px;">
                            <input type="number" class="lvl-input" id="${prefix}_curLvl" min="1" max="${maxLevel}" value="1" oninput="syncLvl('${prefix}_cur', this.value)" style="width: 50px; padding: 4px; font-size: 13px;">
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-muted); min-width: 60px;">${currencyLabel}:</span>
                        <input type="number" id="${prefix}_sim_currency" class="g-input sim-input" data-cat="${cat}" value="0" min="0" style="flex: 1; padding: 6px; font-size: 13px;">
                    </div>
                    ${cat === 'forge' ? `
                    <div id="forge_extraSimStats" style="margin-top: 5px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); font-size: 13px; color: var(--gold); line-height: 1.5;">
                        <div id="forge_hammerPerGoldStat">현재 기술트리 기준 골드 1m당 필요 망치 : -개</div>
                    </div>` : ''}
                </div>
            </div>
            
            <!-- 우측 컬럼 (예측 출력) -->
            <div style="flex: 1.2;">
                <h3 style="margin: 0; font-size: 15px; color: var(--neon-cyan); margin-bottom: 12px;">예측 시뮬레이터 결과</h3>
                <div id="${prefix}_sim_resultBox" class="result-box" style="min-height: 120px; padding: 15px;">
                    <div style="text-align: center; line-height: 90px; color: var(--text-muted);">결과가 여기에 표시됩니다.</div>
                </div>
            </div>
        </div>

        <!-- 목표 시뮬레이터 (두 번째 행) -->
        <div style="display: flex; gap: 20px;">
            <!-- 좌측 컬럼 (목표 입력) -->
            <div style="flex: 1; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 20px;">
                <h3 style="margin: 0; font-size: 15px; color: var(--gold); margin-bottom: 12px;">목표 레벨 시뮬레이터</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-muted); min-width: 60px;">목표 승천:</span>
                        <div class="asc-chips" id="${prefix}_tarAscChips" style="margin-bottom: 0; flex: 1;">
                            <span class="asc-chip active" onclick="setAsc('${prefix}_tar', 0)" style="padding: 4px 0; font-size: 13px;">0</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_tar', 1)" style="padding: 4px 0; font-size: 13px;">1</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_tar', 2)" style="padding: 4px 0; font-size: 13px;">2</span>
                            <span class="asc-chip" onclick="setAsc('${prefix}_tar', 3)" style="padding: 4px 0; font-size: 13px;">3</span>
                        </div>
                        <input type="hidden" id="${prefix}_tarAsc" value="0">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: var(--text-muted); min-width: 60px;">목표 레벨:</span>
                        <div class="lvl-control" style="margin: 0; flex: 1;">
                            <input type="range" class="lvl-slider" id="${prefix}_tarLvlSlider" min="1" max="${maxLevel}" value="1" oninput="syncLvl('${prefix}_tar', this.value)" style="height: 4px;">
                            <input type="number" class="lvl-input" id="${prefix}_tarLvl" min="1" max="${maxLevel}" value="1" oninput="syncLvl('${prefix}_tar', this.value)" style="width: 50px; padding: 4px; font-size: 13px;">
                        </div>
                    </div>
                    <!-- 확률 표시 -->
                    <div id="${prefix}_tar_probDisplayContainer" style="padding: 6px 10px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); min-height: 24px; margin-top: 5px; display: flex; align-items: center;">
                        <span style="font-size: 12px; color: var(--text-muted);">레벨을 변경하면 확률이 표시됩니다.</span>
                    </div>
                    <!-- 퀵버튼 -->
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 5px;">
                        <span style="font-size: 13px; color: var(--text-main); font-weight: bold;">퀵버튼:</span>
                        ${quickBtns}
                    </div>
                </div>
            </div>
            
            <!-- 우측 컬럼 (목표 출력) -->
            <div style="flex: 1.2;">
                <h3 id="${prefix}_tar_resultTitle" style="margin: 0; font-size: 15px; color: var(--gold); margin-bottom: 12px;">목표 시뮬레이터 결과</h3>
                <div id="${prefix}_resultBox" class="result-box" style="padding: 15px;"></div>
            </div>
        </div>
    `;

    document.getElementById(containerId).innerHTML = html;
    updateProbabilitiesDisplay(prefix + '_tar', 1);
}


function updateProbabilitiesDisplay(prefix, level) {
    let cat = prefix.replace('_tar', '');
    let data = Data[cat];
    if (!data) return;

    let row = data.find(r => r.level == level) || data[data.length - 1];

    let grades = [];
    if (cat === 'forge') {
        grades = [
            { n: '원시', c: 'var(--color-primitive)' },
            { n: '중세', c: 'var(--color-medieval)' },
            { n: '근대', c: 'var(--color-earlymodern)' },
            { n: '현대', c: 'var(--color-modern)' },
            { n: '우주', c: 'var(--color-space)' },
            { n: '항성', c: 'var(--color-interstellar)' },
            { n: '다중', c: 'var(--color-multiverse)' },
            { n: '양자', c: 'var(--color-quantum)' },
            { n: '지하', c: 'var(--color-underworld)' },
            { n: '신성', c: 'var(--color-divine)' }
        ];
    } else {
        grades = [
            { n: '일반', c: 'var(--color-common)' },
            { n: '희귀', c: 'var(--color-rare)' },
            { n: '서사', c: 'var(--color-epic)' },
            { n: '전설', c: 'var(--color-legendary)' },
            { n: '궁극', c: 'var(--color-ultimate)' },
            { n: '신화', c: 'var(--color-mythic)' }
        ];
    }

    let container = document.getElementById(`${prefix}_probDisplayContainer`);
    if (!container) return;

    let html = '<div style="display: flex; gap: 8px; flex-wrap: nowrap; justify-content: flex-start; align-items: center; overflow: hidden; width: 100%;">';
    row.probs.forEach((p, idx) => {
        if (p > 0) {
            html += `<span style="font-size:11.5px; font-weight:bold; color:${grades[idx].c}; white-space:nowrap;">${grades[idx].n}: ${p.toFixed(2)}%</span>`;
        }
    });
    html += '</div>';

    container.innerHTML = html;
}

function setTargetLevel(prefix, level) {
    syncLvl(`${prefix}_tar`, level);
}

function setAsc(prefix, val) {
    document.getElementById(`${prefix}Asc`).value = val;
    let chips = document.getElementById(`${prefix}AscChips`).querySelectorAll('.asc-chip');
    chips.forEach((c, idx) => {
        if (idx === val) c.classList.add('active');
        else c.classList.remove('active');
    });
    triggerCalculate();
}

function syncLvl(prefix, val) {
    let inputEl = document.getElementById(`${prefix}Lvl`);
    let max = parseInt(inputEl.max) || 100;

    // 비어있는 입력이나 유효하지 않은 값 처리 방지 (계산기 튕김 방지)
    if (val === "" || isNaN(val)) {
        return; // 사용자가 입력 중일 때는 계산을 건너뜁니다.
    }

    val = Math.max(1, Math.min(parseInt(val) || 1, max));

    inputEl.value = val;
    document.getElementById(`${prefix}LvlSlider`).value = val;

    if (prefix.endsWith('_tar')) {
        let cat = prefix.replace('_tar', '');
        updateProbabilitiesDisplay(prefix, val);
    }

    triggerCalculate();
}


// -----------------------------------------
// 대장간 계산기 UI 로직
// -----------------------------------------
function initForge() {
    buildTierSelectors('forgeGlobalContainer', 'forgeGlobal', '기술트리 일괄 설정');
    let html = "";
    Data.forgeCategories.forEach(cat => {
        html += `<div id="forge_${cat.key}Container"></div>`;
    });
    document.getElementById('forgeTiers').innerHTML = html;

    Data.forgeCategories.forEach(cat => {
        buildTierSelectors(`forge_${cat.key}Container`, `forge_${cat.key}`, cat.name);
    });

    // 장비 세팅
    buildTierSelectors('forgeEquipAllContainer', 'forgeEquipAll', '장비레벨 일괄 설정');

    let partsHtml = "";
    Data.forgeEquipParts.forEach(p => {
        partsHtml += `<div id="forge_${p}Container" class="equip-item"></div>`;
    });
    document.getElementById('forgeEquipParts').innerHTML = partsHtml;

    Data.forgeEquipParts.forEach(p => {
        buildTierSelectors(`forge_${p}Container`, `forge_${p}`, Data.forgeEquipNames[p]);
    });

    // 통합 시뮬레이터 UI 생성
    buildCombinedSimulatorUI('forge_simulatorContainer', '대장간', 'forge', 35, '보유한 망치 수');
}

function calcForge(prefix = 'forge') {
    let timeLvl = getTotalTier("forge_timeAccel");
    let costLvl = getTotalTier("forge_costReduction");
    let sellLvl = getTotalTier("forge_sellPrice");
    let refineLvl = getTotalTier("forge_freeRefine");

    let timeAccel = timeLvl * 0.02;
    let costReduction = costLvl * 0.01;
    let sellPrice = sellLvl * 0.01;
    let refineChance = refineLvl * 0.01;

    document.getElementById("forge_timeAccelStat").innerText = `누적 ${Math.round(timeAccel * 100)}%`;
    document.getElementById("forge_costReductionStat").innerText = `누적 ${Math.round(costReduction * 100)}%`;
    document.getElementById("forge_sellPriceStat").innerText = `누적 ${Math.round(sellPrice * 100)}%`;
    document.getElementById("forge_freeRefineStat").innerText = `누적 ${Math.round(refineChance * 100)}%`;

    let currentAsc = Number(document.getElementById(`${prefix}_curAsc`).value);
    let targetAsc = Number(document.getElementById(`${prefix}_tarAsc`).value);
    let currentLevel = Number(document.getElementById(`${prefix}_curLvl`).value);
    let targetLevel = Number(document.getElementById(`${prefix}_tarLvl`).value);
    let ownedCoins = 0;

    let allTierDots = getTotalTier("forgeEquipAll");
    let eqAllStatEl = document.getElementById("forgeEquipAllStat");
    if (eqAllStatEl) eqAllStatEl.innerText = `기준 획득 레벨 : +${allTierDots * 2}`;

    let sum = 0;
    Data.forgeEquipParts.forEach(p => {
        let tierDots = getTotalTier(`forge_${p}`);
        let lvl = 99 + (tierDots * 2);
        let statEl = document.getElementById(`forge_${p}Stat`);
        if (statEl) statEl.innerText = `레벨 : ${lvl}`;
        sum += lvl;
    });
    let equipAvg = sum / Data.forgeEquipParts.length;

    let hammerBase = Math.round(20 * Math.pow(1.01, equipAvg - 1));
    let hammerSell = hammerBase * (1 + sellPrice);
    let refineMulti = 1 / (1 - refineChance);
    let hammerValue = hammerSell * refineMulti;

    let hammersFor1M = 1000000 / hammerValue;
    let hammerPerGoldEl = document.getElementById("forge_hammerPerGoldStat");
    if (hammerPerGoldEl) hammerPerGoldEl.innerText = `현재 기술트리 기준 골드 1m당 필요 망치 : 대략 ${hammersFor1M.toLocaleString(undefined, {maximumFractionDigits: 0})}개`;

    let resultBox = document.getElementById(`${prefix}_resultBox`);
    let res = Calculators.calculateForge(currentAsc, targetAsc, currentLevel, targetLevel, timeAccel, costReduction, sellPrice, refineChance, ownedCoins, equipAvg);

    if (res.error) {
        resultBox.className = "result-box error";
        resultBox.style.padding = "15px";
        resultBox.innerHTML = `<div class="result-stat-card error-card"><div class="result-stat-value">${res.error}</div></div>`;
        return;
    }

    resultBox.className = "result-box";
    resultBox.style.padding = "15px";
    resultBox.innerHTML = `
    <div style="display: flex; gap: 20px; font-size: 15px;">
        <div style="flex: 0.55; display: flex; flex-direction: column; gap: 12px; border-right: 2px solid rgba(255,255,255,0.15); padding-right: 15px; justify-content: center; align-items: flex-start;">
            <strong style="color: var(--text-main); font-size: 16px; line-height: 1.4;">
                승천 : ${currentAsc} &gt; ${targetAsc}<br>
                레벨 : ${currentLevel} &gt; ${targetLevel}
            </strong>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
            <div class="result-stat-card" style="--stat-accent: #00e5ff;">
                <div class="result-stat-label">총 골드</div>
                <div class="result-stat-value">${formatNumberCeil(res.finalCost)}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #FFF35C;">
                <div class="result-stat-label">필요 망치</div>
                <div class="result-stat-value">${res.hammerNeed.toLocaleString()}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #74F28B;">
                <div class="result-stat-label">총 시간</div>
                <div class="result-stat-value">${formatTime(res.finalTime)}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #D05CF7;">
                <div class="result-stat-label">즉시완료 보석</div>
                <div class="result-stat-value">${res.totalGem.toLocaleString()}</div>
            </div>
        </div>
    </div>
    `;
}

// -----------------------------------------
// 스킬 계산기 UI 로직
// -----------------------------------------
function initSkill() {
    buildTierSelectors('skillTiers', 'skill_cost', '스킬 소환 비용 감소');
    // 통합 시뮬레이터 UI 생성
    buildCombinedSimulatorUI('skill_simulatorContainer', '스킬', 'skill', 100, '보유한 티켓 수');
}

function calcSkill(prefix = 'skill') {
    let discount = getTotalTier("skill_cost") * 0.01;
    document.getElementById("skill_costStat").innerText = `누적 ${Math.round(discount * 100)}%`;

    let curAsc = Number(document.getElementById(`${prefix}_curAsc`).value);
    let tarAsc = Number(document.getElementById(`${prefix}_tarAsc`).value);
    let curLvl = Number(document.getElementById(`${prefix}_curLvl`).value);
    let tarLvl = Number(document.getElementById(`${prefix}_tarLvl`).value);

    let resultBox = document.getElementById(`${prefix}_resultBox`);
    let res = Calculators.calculateSkill(curAsc, tarAsc, curLvl, tarLvl, discount);

    if (res.error) {
        resultBox.className = "result-box error";
        resultBox.style.padding = "15px";
        resultBox.innerHTML = `<div class="result-stat-card error-card"><div class="result-stat-value">${res.error}</div></div>`;
        return;
    }

    resultBox.className = "result-box";
    resultBox.style.padding = "15px";
    resultBox.innerHTML = `
    <div style="display: flex; gap: 20px; font-size: 15px;">
        <div style="flex: 0.55; display: flex; flex-direction: column; gap: 12px; border-right: 2px solid rgba(255,255,255,0.15); padding-right: 15px; justify-content: center; align-items: flex-start;">
            <strong style="color: var(--text-main); font-size: 16px; line-height: 1.4;">
                승천 : ${curAsc} &gt; ${tarAsc}<br>
                레벨 : ${curLvl} &gt; ${tarLvl}
            </strong>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
            <div class="result-stat-card" style="--stat-accent: #00e5ff;">
                <div class="result-stat-label">필요 소환 횟수</div>
                <div class="result-stat-value">${res.totalSummons.toLocaleString()}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #D05CF7;">
                <div class="result-stat-label">필요 스킬 티켓</div>
                <div class="result-stat-value">${res.ticketsNeeded.toLocaleString()} <span style="font-size: 16px; color: var(--text-muted); font-weight: normal;">(${formatNumber(res.ticketsNeeded)})</span></div>
            </div>
        </div>
    </div>
    `;
}

// -----------------------------------------
// 펫 계산기 UI 로직
// -----------------------------------------
function initPet() {
    buildTierSelectors('petTiers', 'pet_bonus', '추가 알 기회');
    // 통합 시뮬레이터 UI 생성
    buildCombinedSimulatorUI('pet_simulatorContainer', '펫', 'pet', 100, '보유한 알 수');
}

function calcPet(prefix = 'pet') {
    let bonus = getTotalTier("pet_bonus") * 0.02;
    document.getElementById("pet_bonusStat").innerText = `누적 ${Math.round(bonus * 100)}%`;

    let curAsc = Number(document.getElementById(`${prefix}_curAsc`).value);
    let tarAsc = Number(document.getElementById(`${prefix}_tarAsc`).value);
    let curLvl = Number(document.getElementById(`${prefix}_curLvl`).value);
    let tarLvl = Number(document.getElementById(`${prefix}_tarLvl`).value);

    let resultBox = document.getElementById(`${prefix}_resultBox`);
    let res = Calculators.calculatePet(curAsc, tarAsc, curLvl, tarLvl, bonus);

    if (res.error) {
        resultBox.className = "result-box error";
        resultBox.style.padding = "15px";
        resultBox.innerHTML = `<div class="result-stat-card error-card"><div class="result-stat-value">${res.error}</div></div>`;
        return;
    }

    resultBox.className = "result-box";
    resultBox.style.padding = "15px";
    resultBox.innerHTML = `
    <div style="display: flex; gap: 20px; font-size: 15px;">
        <div style="flex: 0.55; display: flex; flex-direction: column; gap: 12px; border-right: 2px solid rgba(255,255,255,0.15); padding-right: 15px; justify-content: center; align-items: flex-start;">
            <strong style="color: var(--text-main); font-size: 16px; line-height: 1.4;">
                승천 : ${curAsc} &gt; ${tarAsc}<br>
                레벨 : ${curLvl} &gt; ${tarLvl}
            </strong>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
            <div class="result-stat-card" style="--stat-accent: #00e5ff;">
                <div class="result-stat-label">필요 소환 횟수</div>
                <div class="result-stat-value">${res.totalSummons.toLocaleString()}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #74F28B;">
                <div class="result-stat-label">필요 알</div>
                <div class="result-stat-value">${res.eggsNeeded.toLocaleString()} <span style="font-size: 16px; color: var(--text-muted); font-weight: normal;">(${formatNumber(res.eggsNeeded)})</span></div>
            </div>
        </div>
    </div>
    `;
}

// -----------------------------------------
// 탈것 계산기 UI 로직
// -----------------------------------------
function initMount() {
    buildTierSelectors('mountCostTiers', 'mount_cost', '탈것 소환 비용 감소');
    buildTierSelectors('mountBonusTiers', 'mount_bonus', '추가 탈것 기회');
    // 통합 시뮬레이터 UI 생성
    buildCombinedSimulatorUI('mount_simulatorContainer', '탈것', 'mount', 100, '보유한 태엽 수');
}

function calcMount(prefix = 'mount') {
    let costReduction = getTotalTier("mount_cost") * 0.01;
    let bonus = getTotalTier("mount_bonus") * 0.02;
    document.getElementById("mount_costStat").innerText = `누적 ${Math.round(costReduction * 100)}%`;
    document.getElementById("mount_bonusStat").innerText = `누적 ${Math.round(bonus * 100)}%`;

    let curAsc = Number(document.getElementById(`${prefix}_curAsc`).value);
    let tarAsc = Number(document.getElementById(`${prefix}_tarAsc`).value);
    let curLvl = Number(document.getElementById(`${prefix}_curLvl`).value);
    let tarLvl = Number(document.getElementById(`${prefix}_tarLvl`).value);

    let resultBox = document.getElementById(`${prefix}_resultBox`);
    let res = Calculators.calculateMount(curAsc, tarAsc, curLvl, tarLvl, costReduction, bonus);

    if (res.error) {
        resultBox.className = "result-box error";
        resultBox.style.padding = "15px";
        resultBox.innerHTML = `<div class="result-stat-card error-card"><div class="result-stat-value">${res.error}</div></div>`;
        return;
    }

    resultBox.className = "result-box";
    resultBox.style.padding = "15px";
    resultBox.innerHTML = `
    <div style="display: flex; gap: 20px; font-size: 15px;">
        <div style="flex: 0.55; display: flex; flex-direction: column; gap: 12px; border-right: 2px solid rgba(255,255,255,0.15); padding-right: 15px; justify-content: center; align-items: flex-start;">
            <strong style="color: var(--text-main); font-size: 16px; line-height: 1.4;">
                승천 : ${curAsc} &gt; ${tarAsc}<br>
                레벨 : ${curLvl} &gt; ${tarLvl}
            </strong>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
            <div class="result-stat-card" style="--stat-accent: #00e5ff;">
                <div class="result-stat-label">필요 소환 횟수</div>
                <div class="result-stat-value">${res.totalSummons.toLocaleString()}</div>
            </div>
            <div class="result-stat-card" style="--stat-accent: #FFF35C;">
                <div class="result-stat-label">필요 태엽</div>
                <div class="result-stat-value">${res.gearNeeded.toLocaleString()} <span style="font-size: 16px; color: var(--text-muted); font-weight: normal;">(${formatNumber(res.gearNeeded)})</span></div>
            </div>
        </div>
    </div>
    `;
}

// -----------------------------------------
// Navigation & SPA Logic
// -----------------------------------------
function switchTab(pageId, btn) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

    document.getElementById(pageId).classList.add('active');

    if (btn) {
        btn.classList.add('active');
    } else {
        let tabs = document.querySelectorAll('.nav-tab');
        for (let tab of tabs) {
            if (tab.getAttribute('onclick').includes(pageId)) {
                tab.classList.add('active');
            }
        }
    }

    if (pageId === 'dataPage') {
        showDataTab('forge');
    } else if (pageId === 'guidePage') {
        switchGuideTab('forge');
    }
}

// -----------------------------------------
// Simulator & Data Dictionary Logic
// -----------------------------------------
function showDataTab(category) {
    // Update active button
    document.querySelectorAll('#dataPage .global-tier-btns .g-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(category)) btn.classList.add('active');
    });

    let data = Data[category];
    if (!data) return;

    let html = `<table class="data-table"><thead><tr>`;
    html += `<th>Level</th>`;

    let grades = [];
    if (category === 'forge') {
        html += `<th>Cost</th><th>Time</th>`;
        grades = [
            { n: '원시', c: 'var(--color-primitive)' },
            { n: '중세', c: 'var(--color-medieval)' },
            { n: '근대', c: 'var(--color-earlymodern)' },
            { n: '현대', c: 'var(--color-modern)' },
            { n: '우주', c: 'var(--color-space)' },
            { n: '항성', c: 'var(--color-interstellar)' },
            { n: '다중', c: 'var(--color-multiverse)' },
            { n: '양자', c: 'var(--color-quantum)' },
            { n: '지하', c: 'var(--color-underworld)' },
            { n: '신성', c: 'var(--color-divine)' }
        ];
    } else {
        html += `<th>Summons</th>`;
        grades = [
            { n: '일반', c: 'var(--color-common)' },
            { n: '희귀', c: 'var(--color-rare)' },
            { n: '서사', c: 'var(--color-epic)' },
            { n: '전설', c: 'var(--color-legendary)' },
            { n: '궁극', c: 'var(--color-ultimate)' },
            { n: '신화', c: 'var(--color-mythic)' }
        ];
    }

    grades.forEach(g => {
        html += `<th style="color: ${g.c}">${g.n}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.forEach(row => {
        html += `<tr>`;
        html += `<td>${row.level}</td>`;
        if (category === 'forge') {
            let c = row.costNum !== undefined ? row.costNum : NaN;
            let timeStr = row.time || "N/A";
            html += `<td>${isNaN(c) ? "N/A" : formatNumber(c)}</td><td>${timeStr}</td>`;
        } else {
            html += `<td>${row.summonNum}</td>`;
        }
        row.probs.forEach((p, idx) => {
            if (p > 0) {
                html += `<td><span class="prob-badge" style="--badge-color: ${grades[idx].c}">${p.toFixed(2)}%</span></td>`;
            } else {
                html += `<td><span style="color: rgba(255,255,255,0.1)">-</span></td>`;
            }
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;

    document.getElementById('data_table_container').innerHTML = html;
}

function runSimulator(cat, prefix = cat) {
    let startLvl = parseInt(document.getElementById(`${prefix}_curLvl`).value) || 1;
    let startAsc = parseInt(document.getElementById(`${prefix}_curAsc`).value) || 0;
    let curr = parseFloat(document.getElementById(`${prefix}_sim_currency`).value) || 0;

    let data = Data[cat];
    let resultBox = document.getElementById(`${prefix}_sim_resultBox`);

    if (!data || data.length === 0) return;

    // 1. 각 탭에 설정된 전역 티어 스펙 불러오기
    let costReduction = 0;
    let bonus = 0;
    let hammerValue = 1;

    if (cat === 'skill') {
        costReduction = getTotalTier("skill_cost") * 0.01;
    } else if (cat === 'pet') {
        bonus = getTotalTier("pet_bonus") * 0.02;
    } else if (cat === 'mount') {
        costReduction = getTotalTier("mount_cost") * 0.01;
        bonus = getTotalTier("mount_bonus") * 0.02;
    } else if (cat === 'forge') {
        let sellPrice = getTotalTier("forge_sellPrice") * 0.01;
        let refineChance = getTotalTier("forge_freeRefine") * 0.01;
        costReduction = getTotalTier("forge_costReduction") * 0.01;

        let sum = 0;
        Data.forgeEquipParts.forEach(p => { sum += (99 + (getTotalTier(`forge_${p}`) * 2)); });
        let equipAvg = sum / Data.forgeEquipParts.length;

        let hammerBase = Math.round(20 * Math.pow(1.01, equipAvg - 1));
        let hammerSell = hammerBase * (1 + sellPrice);
        let refineMulti = 1 / (1 - refineChance);
        hammerValue = hammerSell * refineMulti;
    }

    let currentLvl = startLvl;
    let currentAsc = startAsc;
    let remainingCurrency = curr;
    let currentProgress = 0;
    let totalDraws = 0;
    let expectedCounts = new Array(cat === 'forge' ? 10 : 6).fill(0);
    let requiredForNext = 0;

    let maxLvlData = data[data.length - 1].level;

    // 2. 동적 시뮬레이션 루프
    while (true) {
        if (currentAsc === 3 && currentLvl >= maxLvlData) {
            break; // 4승천 불가, 3승천 만렙 도달 시 즉시 종료 (승천 비용 지불 불필요)
        }

        if (currentLvl > maxLvlData) {
            if (currentAsc < 3) {
                currentAsc++;
                currentLvl = 1;
            } else {
                break;
            }
        }

        let row = data.find(r => r.level === currentLvl);
        if (!row) {
            row = data[data.length - 1];
        }

        let costPerSummon = 0;
        let requiredSummonsForLevelUp = 0;

        if (cat === 'forge') {
            let reqRow = row;
            if (reqRow.costNum === undefined) break; // 계산불가구간
            let levelCostCoin = reqRow.costNum;

            let actualLevelCostCoin = levelCostCoin * (1 - costReduction);
            requiredSummonsForLevelUp = actualLevelCostCoin / hammerValue;
            costPerSummon = 1; // 망치 1개당 1번
        } else {
            let reqRow = row;
            if (!reqRow.summonNum) {
                if (currentAsc < 3) {
                    currentAsc++;
                    currentLvl = 1;
                    continue;
                } else {
                    break;
                }
            }
            requiredSummonsForLevelUp = reqRow.summonNum;

            if (cat === 'skill') {
                costPerSummon = 40 * (1 - costReduction);
            } else if (cat === 'pet') {
                costPerSummon = 100 / (1 + bonus);
            } else if (cat === 'mount') {
                costPerSummon = Math.round(50 * (1 - costReduction)) / (1 + bonus);
            }
        }

        requiredForNext = requiredSummonsForLevelUp;
        let remainingProgressNeeded = requiredSummonsForLevelUp - currentProgress;

        if (remainingProgressNeeded <= 0) {
            currentLvl++;
            currentProgress -= requiredSummonsForLevelUp;
            continue;
        }

        if (remainingCurrency <= 0 && remainingProgressNeeded > 0) break;

        let affordableSummons = Math.floor(remainingCurrency / costPerSummon);
        if (affordableSummons <= 0 && remainingProgressNeeded > 0) break;

        let stepSummons = Math.min(affordableSummons, Math.ceil(remainingProgressNeeded));

        // 기댓값 누적
        row.probs.forEach((p, i) => {
            expectedCounts[i] += stepSummons * (p / 100);
        });

        totalDraws += stepSummons;
        remainingCurrency -= stepSummons * costPerSummon;
        currentProgress += stepSummons;

        if (currentProgress >= requiredSummonsForLevelUp) {
            currentLvl++;
            currentProgress -= requiredSummonsForLevelUp;
        }
    }

    let grades = [];
    if (cat === 'forge') {
        grades = [
            { n: '원시', c: 'var(--color-primitive)' }, { n: '중세', c: 'var(--color-medieval)' },
            { n: '근대', c: 'var(--color-earlymodern)' }, { n: '현대', c: 'var(--color-modern)' },
            { n: '우주', c: 'var(--color-space)' }, { n: '항성', c: 'var(--color-interstellar)' },
            { n: '다중', c: 'var(--color-multiverse)' }, { n: '양자', c: 'var(--color-quantum)' },
            { n: '지하', c: 'var(--color-underworld)' }, { n: '신성', c: 'var(--color-divine)' }
        ];
    } else {
        grades = [
            { n: '일반', c: 'var(--color-common)' }, { n: '희귀', c: 'var(--color-rare)' },
            { n: '서사', c: 'var(--color-epic)' }, { n: '전설', c: 'var(--color-legendary)' },
            { n: '궁극', c: 'var(--color-ultimate)' }, { n: '신화', c: 'var(--color-mythic)' }
        ];
    }

    let maxLvl = data[data.length - 1].level;
    let isMax = false;
    let finalReqRow = data.find(r => r.level === currentLvl) || data[data.length - 1];

    if (cat === 'forge') {
        isMax = (currentAsc === 3 && currentLvl >= maxLvl);
    } else {
        if (!finalReqRow.summonNum) {
            isMax = (currentAsc === 3 && currentLvl >= maxLvl);
        } else {
            isMax = (currentAsc === 3 && currentLvl > maxLvl);
        }
    }

    let highlightColor = isMax ? "#FFD700" : "var(--text-main)";

    let progressStr = '';
    let reqSummons = 0;
    if (isMax) {
        if (cat === 'forge') {
            reqSummons = (data[data.length - 1].costNum * (1 - costReduction)) / hammerValue;
        } else {
            reqSummons = data[data.length - 1].summonNum || (data[data.length - 2] ? data[data.length - 2].summonNum : 0);
        }
    } else {
        reqSummons = requiredForNext;
    }

    if (cat === 'forge') {
        let curGold = currentProgress * hammerValue;
        let reqGold = reqSummons * hammerValue;
        progressStr = isMax ? `MAX` : `${formatNumberCeil(curGold)} / ${formatNumberCeil(reqGold)}`;
    } else {
        progressStr = isMax ? `MAX` : `${formatNumber(currentProgress)} / ${formatNumber(reqSummons)}`;
    }

    let html = `
    <div style="display: flex; gap: 20px; font-size: 15px;">
        <!-- 왼쪽 컬럼 -->
        <div style="flex: 0.55; display: flex; flex-direction: column; gap: 12px; border-right: 2px solid rgba(255,255,255,0.15); padding-right: 15px; justify-content: center; align-items: flex-start;">
            <!-- 1. 최종 레벨 예상 -->
            <strong style="color: ${highlightColor}; font-size: 16px; line-height: 1.4;">
                승천 : ${startAsc} &gt; ${isMax ? 3 : currentAsc}<br>
                레벨 : ${startLvl} &gt; ${isMax ? maxLvl : currentLvl}
            </strong>
            
            <!-- 2. 잔여 상태 요약 -->
            <strong style="font-size: 16px; color: ${highlightColor};">
                ${progressStr}
            </strong>
        </div>
        
        <!-- 오른쪽 컬럼 (뱃지들) -->
        <div style="flex: 1.5; display: grid; grid-template-columns: repeat(${cat === 'forge' ? 5 : 3}, 1fr); gap: 6px; align-content: center;">
    `;

    expectedCounts.forEach((expected, i) => {
        html += `<span class="result-badge" style="margin: 0; min-height: 52px; --badge-color: ${grades[i].c}; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 6px 4px; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: clip;"><span style="font-size: 12px;">${grades[i].n}</span><strong style="font-size: 14px; margin-top: 2px;">${Math.round(expected).toLocaleString()}개</strong></span>`;
    });

    html += `
        </div>
    </div>
    `;

    resultBox.innerHTML = html;
}

// -----------------------------------------
// 초기화
// -----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initForge();
    initSkill();
    initPet();
    initMount();

    // 계산기 입력값 변경 시 자동 계산 이벤트 바인딩
    document.querySelectorAll("input:not(.sim-input), select").forEach(el => {
        el.addEventListener('input', () => {
            triggerCalculate();
            // 기술트리 변경 시 해당 페이지의 시뮬레이터도 다시 계산
            ['forge', 'skill', 'pet', 'mount'].forEach(cat => {
                runSimulator(cat);
            });
        });
    });

    // 시뮬레이터 입력값 변경 시 해당 카테고리만 자동 계산
    document.querySelectorAll('.sim-input').forEach(el => {
        el.addEventListener('input', () => {
            let cat = el.getAttribute('data-cat');
            runSimulator(cat);
        });
    });

    triggerCalculate();
});


// =========================================
// 승천 가이드 로직
// =========================================

function switchGuideTab(tabId) {
    const tabs = ['forge', 'skill', 'pet', 'mount'];

    tabs.forEach(t => {
        const btn = document.getElementById('guideTab_' + t);
        const div = document.getElementById('guide_' + t);
        if (btn) btn.classList.remove('active');
        if (div) div.style.display = 'none';
    });

    const activeBtn = document.getElementById('guideTab_' + tabId);
    const activeDiv = document.getElementById('guide_' + tabId);
    if (activeBtn) activeBtn.classList.add('active');
    if (activeDiv) activeDiv.style.display = 'block';

    renderGuideTable();
}

function calculateUnlockCost(dataCategory, targetGradeIdx, discount, bonus) {
    let data = Data[dataCategory];
    if (!data) return Infinity;

    // 1. 해당 등급이 최초로 등장하는(확률 > 0) 레벨 찾기
    let targetLevel = -1;
    for (let row of data) {
        if (row.probs[targetGradeIdx] > 0) {
            targetLevel = row.level;
            break;
        }
    }

    if (targetLevel === -1) return Infinity;

    // 2. calculators.js 의 계산 로직을 동일하게 호출 (0승천 1레벨 -> 0승천 targetLevel)
    if (dataCategory === 'skill') {
        let res = Calculators.calculateSkill(0, 0, 1, targetLevel, discount);
        return res.error ? Infinity : res.ticketsNeeded;
    } else if (dataCategory === 'pet') {
        let res = Calculators.calculatePet(0, 0, 1, targetLevel, bonus);
        return res.error ? Infinity : res.eggsNeeded;
    } else if (dataCategory === 'mount') {
        let res = Calculators.calculateMount(0, 0, 1, targetLevel, discount, bonus);
        return res.error ? Infinity : res.gearNeeded;
    }

    return Infinity;
}

let forgeGuideEquipDots = 0; // Default 0
let forgeGuideDisplayMode = 'gold';

function setForgeGuideDisplay(mode) {
    forgeGuideDisplayMode = mode;
    
    const btns = document.getElementById('forgeGuideDisplayBtns').children;
    for(let i=0; i<btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('onclick').includes(mode)) {
            btns[i].classList.add('active');
        }
    }
    
    renderGuideTable();
}

function setForgeGuideEquip(dots) {
    forgeGuideEquipDots = dots;

    // Update button styling
    const btns = document.getElementById('forgeGuideEquipBtns').children;
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
        if (btns[i].getAttribute('onclick') === `setForgeGuideEquip(${dots})`) {
            btns[i].classList.add('active');
        }
    }

    renderGuideTable(); // Re-render the guide
}

function calculateForgeUnlockCost(targetGradeIdx, forgeDots, equipDots) {
    let data = Data['forge'];
    if (!data) return Infinity;

    let targetLevel = -1;
    for (let row of data) {
        if (row.probs[targetGradeIdx] > 0) {
            targetLevel = row.level;
            break;
        }
    }
    if (targetLevel === -1) return Infinity;

    let timeAccel = forgeDots * 0.02;
    let costReduction = forgeDots * 0.01;
    let sellPrice = forgeDots * 0.01;
    let refineChance = forgeDots * 0.01;
    let equipAvg = 99 + (equipDots * 2); 
    
    let res = Calculators.calculateForge(0, 0, 1, targetLevel, timeAccel, costReduction, sellPrice, refineChance, 0, equipAvg);
    if (res.error) return Infinity;
    
    return forgeGuideDisplayMode === 'gold' ? res.finalCost : res.hammerNeed;
}

function renderGuideTable() {
    const forgeTbody = document.getElementById('guide_forge_tbody');
    const skillTbody = document.getElementById('guide_skill_tbody');
    const petTbody = document.getElementById('guide_pet_tbody');
    const mountTbody = document.getElementById('guide_mount_tbody');

    const forgeThead = document.getElementById('guide_forge_thead');
    const skillThead = document.getElementById('guide_skill_thead');
    const petThead = document.getElementById('guide_pet_thead');
    const mountThead = document.getElementById('guide_mount_thead');

    if (!skillTbody || !petTbody || !mountTbody) return;

    const grades = [2, 3, 4, 5]; // 서사, 전설, 궁극, 신화
    const gradeNames = ['서사', '전설', '궁극', '신화'];
    const gradeColors = ['var(--color-epic)', 'var(--color-legendary)', 'var(--color-ultimate)', 'var(--color-mythic)'];

    const forgeGrades = [5, 6, 7, 8, 9]; // 항성 ~ 신성
    const forgeGradeNames = ['항성', '다중', '양자', '지하', '신성'];
    const forgeGradeColors = ['var(--color-interstellar)', 'var(--color-multiverse)', 'var(--color-quantum)', 'var(--color-underworld)', 'var(--color-divine)'];

    function formatNumberGuide(n) {
        if (n === Infinity || isNaN(n)) return '-';
        if (n >= 1000000) return (n / 1000000).toFixed(2) + "m";
        if (n >= 1000) return (n / 1000).toFixed(2) + "k";
        return n.toLocaleString();
    }

    function getUnlockText(catKey, gradeIdx) {
        let data = Data[catKey];
        if (!data) return '';
        for (let row of data) {
            let p = row.probs[gradeIdx];
            if (p > 0) {
                let pStr = p % 1 === 0 ? p : p.toFixed(2).replace(/\.?0+$/, '');
                return `${row.level}레벨 ${pStr}%`;
            }
        }
        return '-';
    }

    function buildThead(catName, currencyName, catKey) {
        let html = `
            <tr style="background: rgba(0,0,0,0.4); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 20px 10px; border-right: 1px solid var(--border-color); width: 20%; font-size: 18px;">${catName} 기술트리</th>`;

        grades.forEach((g, i) => {
            let unlockStr = getUnlockText(catKey, g);
            let borderStr = g === 5 ? '' : 'border-right: 1px solid rgba(255,255,255,0.1);';
            html += `<th style="padding: 20px 5px; ${borderStr} color: ${gradeColors[i]}; width: 20%;">
                <div style="font-size: 20px; margin-bottom: 6px;">${gradeNames[i]}</div>
                <div style="font-size: 14px; opacity: 0.8; font-weight: normal; color: var(--text-muted);">(${unlockStr})</div>
            </th>`;
        });

        html += `</tr>`;
        return html;
    }

    function buildForgeThead() {
        let displayUnit = forgeGuideDisplayMode === 'gold' ? '골드' : '망치';
        let html = `
            <tr style="background: rgba(0,0,0,0.4); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 20px 10px; border-right: 1px solid var(--border-color); width: 16.66%; font-size: 18px;">대장간 기술트리<br><span style="font-size:14px; color:var(--text-muted); font-weight:normal;">(단위: ${displayUnit})</span></th>`;

        forgeGrades.forEach((g, i) => {
            let unlockStr = getUnlockText('forge', g);
            let borderStr = g === 9 ? '' : 'border-right: 1px solid rgba(255,255,255,0.1);';
            html += `<th style="padding: 20px 5px; ${borderStr} color: ${forgeGradeColors[i]}; width: 16.66%;">
                <div style="font-size: 20px; margin-bottom: 6px;">${forgeGradeNames[i]}</div>
                <div style="font-size: 14px; opacity: 0.8; font-weight: normal; color: var(--text-muted);">(${unlockStr})</div>
            </th>`;
        });

        html += `</tr>`;
        return html;
    }

    if (forgeThead) forgeThead.innerHTML = buildForgeThead();
    if (skillThead) skillThead.innerHTML = buildThead('스킬', '티켓', 'skill');
    if (petThead) petThead.innerHTML = buildThead('펫', '알', 'pet');
    if (mountThead) mountThead.innerHTML = buildThead('탈것', '태엽', 'mount');

    const rows = [
        { label: 'T0', dots: 0 },
        { label: 'T1 MAX', dots: 5 },
        { label: 'T2 MAX', dots: 10 },
        { label: 'T3 MAX', dots: 15 },
        { label: 'T4 MAX', dots: 20 },
        { label: 'T5 MAX', dots: 25 }
    ];

    let forgeHtml = '';
    let skillHtml = '';
    let petHtml = '';
    let mountHtml = '';

    rows.forEach(r => {
        // --- Forge ---
        forgeHtml += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        forgeHtml += `<td style="padding: 30px 10px; border-right: 1px solid var(--border-color); font-weight: bold; font-size: 18px;">${r.label}</td>`;
        forgeGrades.forEach((g, idx) => {
            let cost = calculateForgeUnlockCost(g, r.dots, forgeGuideEquipDots);
            let formattedCost;
            if (forgeGuideDisplayMode === 'hammer' && cost !== Infinity) {
                formattedCost = cost.toLocaleString();
            } else {
                formattedCost = formatNumberGuide(cost);
            }
            let costStr = cost === Infinity ? '-' : `<span class="prob-badge" style="--badge-color: ${forgeGradeColors[idx]}; font-size: 18px;">${formattedCost}</span>`;
            forgeHtml += `<td style="padding: 30px 10px; border-right: ${g === 9 ? 'none' : '1px solid rgba(255,255,255,0.1)'};">${costStr}</td>`;
        });
        forgeHtml += `</tr>`;

        // --- Skill ---
        skillHtml += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        skillHtml += `<td style="padding: 30px 10px; border-right: 1px solid var(--border-color); font-weight: bold; font-size: 18px;">${r.label}</td>`;
        let skillDiscount = r.dots * 0.01;
        grades.forEach((g, idx) => {
            let cost = calculateUnlockCost('skill', g, skillDiscount, 0);
            let costStr = cost === Infinity ? '-' : `<span class="prob-badge" style="--badge-color: ${gradeColors[idx]}; font-size: 18px;">${formatNumberGuide(cost)}</span>`;
            skillHtml += `<td style="padding: 30px 10px; border-right: ${g === 5 ? 'none' : '1px solid rgba(255,255,255,0.1)'};">${costStr}</td>`;
        });
        skillHtml += `</tr>`;

        // --- Pet ---
        petHtml += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        petHtml += `<td style="padding: 30px 10px; border-right: 1px solid var(--border-color); font-weight: bold; font-size: 18px;">${r.label}</td>`;
        let petBonus = r.dots * 0.02;
        grades.forEach((g, idx) => {
            let cost = calculateUnlockCost('pet', g, 0, petBonus);
            let costStr = cost === Infinity ? '-' : `<span class="prob-badge" style="--badge-color: ${gradeColors[idx]}; font-size: 18px;">${formatNumberGuide(cost)}</span>`;
            petHtml += `<td style="padding: 30px 10px; border-right: ${g === 5 ? 'none' : '1px solid rgba(255,255,255,0.1)'};">${costStr}</td>`;
        });
        petHtml += `</tr>`;

        // --- Mount ---
        mountHtml += `<tr style="border-bottom: 1px solid var(--border-color);">`;
        mountHtml += `<td style="padding: 30px 10px; border-right: 1px solid var(--border-color); font-weight: bold; font-size: 18px;">${r.label}</td>`;
        let mountDiscount = r.dots * 0.01;
        let mountBonus = r.dots * 0.02;
        grades.forEach((g, idx) => {
            let cost = calculateUnlockCost('mount', g, mountDiscount, mountBonus);
            let costStr = cost === Infinity ? '-' : `<span class="prob-badge" style="--badge-color: ${gradeColors[idx]}; font-size: 18px;">${formatNumberGuide(cost)}</span>`;
            mountHtml += `<td style="padding: 30px 10px; border-right: ${g === 5 ? 'none' : '1px solid rgba(255,255,255,0.1)'};">${costStr}</td>`;
        });
        mountHtml += `</tr>`;
    });

    if (forgeTbody) forgeTbody.innerHTML = forgeHtml;
    if (skillTbody) skillTbody.innerHTML = skillHtml;
    if (petTbody) petTbody.innerHTML = petHtml;
    mountTbody.innerHTML = mountHtml;
}

// 은하수 & 유성우 배경 생성
function initGalaxyBackground() {
    const bg = document.createElement('div');
    bg.id = 'galaxy-bg';
    document.body.insertBefore(bg, document.body.firstChild);
    
    // 고정된 반짝이는 별
    for(let i=0; i<100; i++) {
        let star = document.createElement('div');
        star.className = 'static-star';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        let size = Math.random() * 2;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.animationDelay = (Math.random() * 5) + 's';
        bg.appendChild(star);
    }

    // 떨어지는 유성우
    for(let i=0; i<20; i++) {
        let meteor = document.createElement('div');
        meteor.className = 'meteor';
        meteor.style.left = (Math.random() * 150) + 'vw';
        meteor.style.top = (Math.random() * 100 - 50) + 'vh';
        meteor.style.animationDelay = (Math.random() * 10) + 's';
        meteor.style.animationDuration = (2 + Math.random() * 4) + 's';
        bg.appendChild(meteor);
    }
}

// 스크립트가 로드되면 바로 배경 추가
initGalaxyBackground();
