const Calculators = {
    // -----------------------------------------
    // 대장간 계산 로직
    // -----------------------------------------
    calcForgeGem: function(time, level) {
        if (level <= 4) return 0;
        const base = 652;   // 10분 52초
        const unit = 435;   // 7분 15초
        let t = time - base;
        if (t < 0) return 1;
        return Math.ceil(t / unit) + 1;
    },

    calculateForge: function(currentAsc, targetAsc, currentLevel, targetLevel, timeAccel, costReduction, sellPrice, refineChance, ownedCoins, equipAvg) {
        if (currentAsc > targetAsc || (currentAsc === targetAsc && currentLevel > targetLevel)) {
            return { error: "목표 레벨이 현재보다 낮습니다." };
        }

        let cost = 0;
        let time = 0;
        let totalGem = 0;

        let curA = currentAsc;
        let curL = currentLevel;

        while (true) {
            if (curA === targetAsc) {
                for (let i = curL; i < targetLevel; i++) {
                    let fData = Data.forge[i-1];
                    if (fData && fData.costNum !== undefined) {
                        cost += fData.costNum;
                        time += fData.timeSec;
                        let adjusted = fData.timeSec / (1 + timeAccel);
                        totalGem += this.calcForgeGem(adjusted, i);
                    }
                }
                break;
            }

            for (let i = curL; i <= 35; i++) {
                let fData = Data.forge[i-1];
                if (fData && fData.costNum !== undefined) {
                    cost += fData.costNum;
                    time += fData.timeSec;
                    let adjusted = fData.timeSec / (1 + timeAccel);
                    totalGem += this.calcForgeGem(adjusted, i);
                }
            }
            curA++;
            curL = 1;
        }

        let finalCost = cost * (1 - costReduction);
        let finalTime = time / (1 + timeAccel);

        let hammerBase = Math.round(20 * Math.pow(1.01, equipAvg - 1));
        let hammerSell = hammerBase * (1 + sellPrice);
        let refineMulti = 1 / (1 - refineChance);

        let hammerValue = hammerSell * refineMulti;
        let remainingCost = Math.max(0, finalCost - ownedCoins);
        let hammerNeed = remainingCost / hammerValue;

        return {
            finalCost: finalCost,
            finalTime: finalTime,
            hammerValue: hammerValue,
            hammerNeed: Math.ceil(hammerNeed),
            totalGem: totalGem
        };
    },

    // -----------------------------------------
    // 스킬 계산 로직
    // -----------------------------------------
    calculateSkill: function(curAsc, tarAsc, curLvl, tarLvl, discount) {
        if (curAsc > tarAsc || (curAsc === tarAsc && curLvl > tarLvl)) {
            return { error: "목표 레벨이 현재보다 낮습니다." };
        }

        let total = 0;
        let cA = curAsc;
        let cL = curLvl;

        while (true) {
            if (cA === tarAsc) {
                for (let i = cL; i < tarLvl; i++) {
                    let sData = Data.skill[i-1];
                    if (sData && sData.summonNum !== undefined) total += sData.summonNum;
                }
                break;
            }
            for (let i = cL; i <= 100; i++) {
                let sData = Data.skill[i-1];
                if (sData && sData.summonNum !== undefined) total += sData.summonNum;
            }
            cA++;
            cL = 1;
        }

        let ticket = total * 40 * (1 - discount);
        return {
            totalSummons: total,
            ticketsNeeded: Math.ceil(ticket)
        };
    },

    // -----------------------------------------
    // 펫 계산 로직
    // -----------------------------------------
    calculatePet: function(curAsc, tarAsc, curLvl, tarLvl, bonus) {
        if (curAsc > tarAsc || (curAsc === tarAsc && curLvl > tarLvl)) {
            return { error: "목표 레벨이 현재보다 낮습니다." };
        }

        let total = 0;
        let cA = curAsc;
        let cL = curLvl;

        while (true) {
            if (cA === tarAsc) {
                for (let i = cL; i < tarLvl; i++) {
                    let pData = Data.pet[i-1];
                    if (pData && pData.summonNum !== undefined) total += pData.summonNum;
                }
                break;
            }
            for (let i = cL; i <= 100; i++) {
                let pData = Data.pet[i-1];
                if (pData && pData.summonNum !== undefined) total += pData.summonNum;
            }
            cA++;
            cL = 1;
        }

        let eggs = total * 100;
        let finalEggs = eggs / (1 + bonus);

        return {
            totalSummons: total,
            eggsNeeded: Math.ceil(finalEggs)
        };
    },

    // -----------------------------------------
    // 탈것 계산 로직
    // -----------------------------------------
    calculateMount: function(curAsc, tarAsc, curLvl, tarLvl, costReduction, bonus) {
        if (curAsc > tarAsc || (curAsc === tarAsc && curLvl > tarLvl)) {
            return { error: "목표 레벨이 현재보다 낮습니다." };
        }

        let totalCount = 0;
        let cA = curAsc;
        let cL = curLvl;

        while (true) {
            if (cA === tarAsc) {
                totalCount += (tarLvl - cL) * 20;
                break;
            }
            totalCount += (100 - cL) * 20;
            cA++;
            cL = 1;
        }

        let costPer = Math.round(50 * (1 - costReduction));
        let totalGear = totalCount * costPer;
        let finalGear = totalGear / (1 + bonus);

        return {
            totalSummons: totalCount,
            gearNeeded: Math.ceil(finalGear)
        };
    }
};
