// @ts-check
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /** @type {any} */
    let state = {};

    const inputs = [
        // Core Stats
        'name', 'playerName', 'class', 'level', 'background', 'race', 'alignment', 'xp',
        'stats.str', 'stats.dex', 'stats.con', 'stats.int', 'stats.wis', 'stats.cha',
        'hp.current', 'hp.max', 'hp.temp', 'ac', 'speed', 'hitDice',
        // Money
        'money.cp', 'money.sp', 'money.ep', 'money.gp', 'money.pp', 'money.total',
        'inspiration',
        // Death Saves
        'deathSaves.success1', 'deathSaves.success2', 'deathSaves.success3',
        'deathSaves.failure1', 'deathSaves.failure2', 'deathSaves.failure3',
        // Saving Throws
        'saves.str.prof', 'saves.dex.prof', 'saves.con.prof',
        'saves.int.prof', 'saves.wis.prof', 'saves.cha.prof',
        // Skills
        'skills.acrobatics.prof', 'skills.animal_handling.prof', 'skills.arcana.prof',
        'skills.athletics.prof', 'skills.deception.prof', 'skills.history.prof',
        'skills.insight.prof', 'skills.intimidation.prof', 'skills.investigation.prof',
        'skills.medicine.prof', 'skills.nature.prof', 'skills.perception.prof',
        'skills.performance.prof', 'skills.persuasion.prof', 'skills.religion.prof',
        'skills.sleight_of_hand.prof', 'skills.stealth.prof', 'skills.survival.prof',
        // Other fields
        'proficienciesAndLanguages', 'attacks', 'equipment', 'traits',
        // Page 2
        'personalityTraits', 'ideals', 'bonds', 'flaws', 'appearance', 'backstory',
        'allies', 'additionalFeatures', 'treasure',
        // Page 3 - Spellcasting
        'spellcastingClass', 'spellcastingAbility', 'spellList',
        // Spell Slots
        'spellSlots.level0.total', 'spellSlots.level0.expended',
        'spellSlots.level1.total', 'spellSlots.level1.expended',
        'spellSlots.level2.total', 'spellSlots.level2.expended',
        'spellSlots.level3.total', 'spellSlots.level3.expended',
        'spellSlots.level4.total', 'spellSlots.level4.expended',
        'spellSlots.level5.total', 'spellSlots.level5.expended',
        'spellSlots.level6.total', 'spellSlots.level6.expended',
        'spellSlots.level7.total', 'spellSlots.level7.expended',
        'spellSlots.level8.total', 'spellSlots.level8.expended',
        'spellSlots.level9.total', 'spellSlots.level9.expended'
    ];

    // Skill to ability mapping
    const skillAbilities = {
        'acrobatics': 'dex',
        'animal_handling': 'wis',
        'arcana': 'int',
        'athletics': 'str',
        'deception': 'cha',
        'history': 'int',
        'insight': 'wis',
        'intimidation': 'cha',
        'investigation': 'int',
        'medicine': 'wis',
        'nature': 'int',
        'perception': 'wis',
        'performance': 'cha',
        'persuasion': 'cha',
        'religion': 'int',
        'sleight_of_hand': 'dex',
        'stealth': 'dex',
        'survival': 'wis'
    };

    // Save to ability mapping
    const saveAbilities = {
        'str': 'str',
        'dex': 'dex',
        'con': 'con',
        'int': 'int',
        'wis': 'wis',
        'cha': 'cha'
    };

    /**
     * Calculate ability modifier: (score - 10) / 2, rounded down
     * @param {any} score
     * @returns {number}
     */
    function calculateModifier(score) {
        if (!score || isNaN(score)) return 0;
        return Math.floor((score - 10) / 2);
    }

    /**
     * Calculate proficiency bonus: 1 + (level / 4), rounded up
     * @param {any} level
     * @returns {number}
     */
    function calculateProficiencyBonus(level) {
        if (!level || isNaN(level) || level < 1) return 2;
        return Math.ceil(level / 4) + 1;
    }

    /**
     * Format modifier with + or - sign
     * @param {any} value
     * @returns {string}
     */
    function formatModifier(value) {
        const num = Number(value);
        if (isNaN(num)) return '+0';
        return num >= 0 ? `+${num}` : `${num}`;
    }

    // Update all calculated fields
    function updateCalculatedFields() {
        // Get level and calculate proficiency bonus
        const level = getNestedValue(state, 'level') || 1;
        const profBonus = calculateProficiencyBonus(level);

        // Update proficiency bonus display
        const profBonusEl = /** @type {HTMLInputElement | null} */ (document.getElementById('proficiencyBonus'));
        if (profBonusEl) {
            profBonusEl.value = formatModifier(profBonus);
        }

        // Calculate and display ability modifiers
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        /** @type {Record<string, number>} */
        const modifiers = {};

        abilities.forEach(ability => {
            const score = getNestedValue(state, `stats.${ability}`) || 10;
            const modifier = calculateModifier(score);
            modifiers[ability] = modifier;

            // Update modifier display
            const modEl = document.getElementById(`stats.${ability}.modifier`);
            if (modEl) {
                modEl.textContent = formatModifier(modifier);
            }
        });

        // Calculate and display saving throws
        abilities.forEach(ability => {
            const modifier = modifiers[ability] || 0;
            const isProficient = getNestedValue(state, `saves.${ability}.prof`) || false;
            const saveValue = modifier + (isProficient ? profBonus : 0);

            const saveEl = document.getElementById(`saves.${ability}.value`);
            if (saveEl) {
                saveEl.textContent = formatModifier(saveValue);
            }
        });

        // Calculate and display skill modifiers
        Object.keys(skillAbilities).forEach(skill => {
            // @ts-ignore
            const ability = skillAbilities[skill];
            const abilityMod = modifiers[ability] || 0;
            const isProficient = getNestedValue(state, `skills.${skill}.prof`) || false;
            const skillValue = abilityMod + (isProficient ? profBonus : 0);

            const skillEl = document.getElementById(`skills.${skill}.value`);
            if (skillEl) {
                skillEl.textContent = formatModifier(skillValue);
            }
        });

        // Calculate passive perception (10 + Perception skill modifier)
        const perceptionMod = modifiers['wis'] || 0;
        const perceptionProf = getNestedValue(state, 'skills.perception.prof') || false;
        const passivePerception = 10 + perceptionMod + (perceptionProf ? profBonus : 0);

        const passivePercEl = /** @type {HTMLInputElement | null} */ (document.getElementById('passivePerception'));
        if (passivePercEl) {
            passivePercEl.value = passivePerception.toString();
        }

        // Calculate initiative (Dex modifier)
        const initiativeEl = /** @type {HTMLInputElement | null} */ (document.getElementById('initiative'));
        if (initiativeEl) {
            initiativeEl.value = formatModifier(modifiers['dex'] || 0);
        }

        // Calculate spell save DC and spell attack bonus
        const spellAbility = getNestedValue(state, 'spellcastingAbility') || '';
        const spellAbilityLower = spellAbility.toLowerCase();

        if (spellAbilityLower && modifiers[spellAbilityLower] !== undefined) {
            const spellMod = modifiers[spellAbilityLower] || 0;
            const spellSaveDC = 8 + profBonus + spellMod;
            const spellAttackBonus = profBonus + spellMod;

            const spellSaveDCEl = /** @type {HTMLInputElement | null} */ (document.getElementById('spellSaveDC'));
            if (spellSaveDCEl) {
                spellSaveDCEl.value = spellSaveDC.toString();
            }

            const spellAttackEl = /** @type {HTMLInputElement | null} */ (document.getElementById('spellAttackBonus'));
            if (spellAttackEl) {
                spellAttackEl.value = formatModifier(spellAttackBonus);
            }
        }

        // Update attack calculations for all attack rows
        document.querySelectorAll('.attack-row').forEach(row => {
            updateAttackCalculations(/** @type {HTMLElement} */ (row));
        });

        // Calculate Total Money
        const cp = getNestedValue(state, 'money.cp') || 0;
        const sp = getNestedValue(state, 'money.sp') || 0;
        const ep = getNestedValue(state, 'money.ep') || 0;
        const gp = getNestedValue(state, 'money.gp') || 0;
        const pp = getNestedValue(state, 'money.pp') || 0;

        const totalGold = gp + (pp * 10) + (ep / 2) + (sp / 10) + (cp / 100);
        
        const totalMoneyEl = /** @type {HTMLInputElement | null} */ (document.getElementById('money.total'));
        if (totalMoneyEl) {
            totalMoneyEl.value = totalGold.toFixed(2) + ' GP';
        }
    }

    // Initialize inputs
    inputs.forEach(id => {
        const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
        if (el) {
            // Use 'input' for text/numbers, 'change' for checkboxes
            const eventType = el.type === 'checkbox' ? 'change' : 'input';

            el.addEventListener(eventType, () => {
                updateStateFromUI();
                updateCalculatedFields();
                debouncedUpdate();
            });
        }
    });

    // Debounce function to prevent too many updates
    /** @type {any} */
    let timeout;
    function debouncedUpdate() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            vscode.postMessage({
                type: 'updateData',
                data: state
            });
        }, 300); // 300ms delay
    }

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                const text = message.text;
                try {
                    // Only update state if it's different to avoid cursor jumping
                    const newState = JSON.parse(text);
                    state = newState;
                    
                    // Only update UI if we are NOT currently editing
                    if (!document.activeElement || !inputs.includes(document.activeElement.id)) {
                         updateUIFromState();
                    }
                } catch {
                    // ignore
                }
                return;
        }
    });

    function updateUIFromState() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;

            const val = getNestedValue(state, id);

            if (el.type === 'checkbox') {
                // @ts-ignore
                el.checked = !!val;
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = val !== undefined ? val : '';
            }
        });

        // Update all calculated fields after loading state
        updateCalculatedFields();

        // Load dynamic content
        loadAttacks();
        loadSpells();
    }

    function updateStateFromUI() {
        inputs.forEach(id => {
            const el = /** @type {HTMLInputElement | HTMLTextAreaElement | null} */ (document.getElementById(id));
            if (!el) return;

            let val;
            if (el.type === 'checkbox') {
                // @ts-ignore
                val = el.checked;
            } else {
                val = el.value;
                if (el.type === 'number') {
                    val = parseFloat(val);
                }
            }
            
            setNestedValue(state, id, val);
        });
    }

    /**
     * @param {any} obj
     * @param {string} path
     */
    function getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    /**
     * @param {any} obj
     * @param {string} path
     * @param {any} value
     */
    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        // @ts-ignore
        const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
        if (lastKey) {
            lastObj[lastKey] = value;
        }
    }

    // ========== HP Healing/Damage ==========
    const healBtn = document.getElementById('heal-btn');
    const damageBtn = document.getElementById('damage-btn');
    const hpAdjustInput = /** @type {HTMLInputElement | null} */ (document.getElementById('hp-adjust-amount'));

    if (healBtn && damageBtn && hpAdjustInput) {
        healBtn.addEventListener('click', () => {
            const amount = parseInt(hpAdjustInput.value) || 0;
            if (amount <= 0) return;

            const currentHP = getNestedValue(state, 'hp.current') || 0;
            const maxHP = getNestedValue(state, 'hp.max') || 0;
            const newHP = Math.min(currentHP + amount, maxHP);

            setNestedValue(state, 'hp.current', newHP);
            // Update just the HP field, not the entire UI
            const hpCurrentEl = /** @type {HTMLInputElement | null} */ (document.getElementById('hp.current'));
            if (hpCurrentEl) hpCurrentEl.value = newHP.toString();
            debouncedUpdate();
            hpAdjustInput.value = '';
        });

        damageBtn.addEventListener('click', () => {
            const amount = parseInt(hpAdjustInput.value) || 0;
            if (amount <= 0) return;

            const currentHP = getNestedValue(state, 'hp.current') || 0;
            const maxHP = getNestedValue(state, 'hp.max') || 0;
            const newHP = Math.max(currentHP - amount, -maxHP);

            setNestedValue(state, 'hp.current', newHP);
            // Update just the HP field, not the entire UI
            const hpCurrentEl = /** @type {HTMLInputElement | null} */ (document.getElementById('hp.current'));
            if (hpCurrentEl) hpCurrentEl.value = newHP.toString();
            debouncedUpdate();
            hpAdjustInput.value = '';
        });
    }

    // ========== Dynamic Attacks ==========
    let attackCounter = 0;
    const attacksContainer = document.getElementById('attacks-container');
    const addAttackBtn = document.getElementById('add-attack-btn');

    /**
     * Update attack bonus and damage bonus calculations for an attack row
     * @param {HTMLElement} attackRow
     */
    function updateAttackCalculations(attackRow) {
        const statSelect = /** @type {HTMLSelectElement | null} */ (attackRow.querySelector('[data-field="stat"]'));
        if (!statSelect) return;

        const selectedStat = statSelect.value;
        const abilityScore = getNestedValue(state, `stats.${selectedStat}`) || 10;
        const abilityMod = calculateModifier(abilityScore);
        const level = getNestedValue(state, 'level') || 1;
        const profBonus = calculateProficiencyBonus(level);

        // Attack Bonus = Ability Modifier + Proficiency Bonus
        const attackBonus = abilityMod + profBonus;
        const attackBonusEl = attackRow.querySelector('[data-field="attackBonus"]');
        if (attackBonusEl) {
            attackBonusEl.textContent = formatModifier(attackBonus);
        }

        // Damage Bonus = Ability Modifier only (no proficiency)
        const damageBonus = abilityMod;
        const damageBonusEl = attackRow.querySelector('[data-field="damageBonus"]');
        if (damageBonusEl) {
            damageBonusEl.textContent = formatModifier(damageBonus);
        }
    }

    /**
     * @param {any} attackData
     */
    function createAttackRow(attackData = {}) {
        const attackId = attackCounter++;
        const div = document.createElement('div');
        div.className = 'attack-row';
        div.dataset.attackId = attackId.toString();

        // @ts-ignore
        div.innerHTML = `
            <input type="text" placeholder="Name" value="${attackData.name || ''}" data-field="name" />
            <select data-field="stat">
                <option value="str" ${attackData.stat === 'str' ? 'selected' : ''}>STR</option>
                <option value="dex" ${attackData.stat === 'dex' ? 'selected' : ''}>DEX</option>
                <option value="con" ${attackData.stat === 'con' ? 'selected' : ''}>CON</option>
                <option value="int" ${attackData.stat === 'int' ? 'selected' : ''}>INT</option>
                <option value="wis" ${attackData.stat === 'wis' ? 'selected' : ''}>WIS</option>
                <option value="cha" ${attackData.stat === 'cha' ? 'selected' : ''}>CHA</option>
            </select>
            <div class="attack-bonus-display" data-field="attackBonus">+0</div>
            <input type="text" placeholder="Bonus Dmg" value="${attackData.bonusDamage || ''}" data-field="bonusDamage" />
            <input type="text" placeholder="Damage/Type" value="${attackData.damage || ''}" data-field="damage" />
            <div class="damage-bonus-display" data-field="damageBonus">+0</div>
            <button type="button" class="delete-attack">×</button>
        `;

        // Add event listeners
        div.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', () => {
                updateAttackCalculations(div);
                saveAttacks();
            });
            el.addEventListener('change', () => {
                updateAttackCalculations(div);
                saveAttacks();
            });
        });

        div.querySelector('.delete-attack')?.addEventListener('click', () => {
            div.remove();
            saveAttacks();
        });

        // Calculate initial values
        updateAttackCalculations(div);

        return div;
    }

    function saveAttacks() {
        /** @type {any[]} */
        const attacks = [];
        attacksContainer?.querySelectorAll('.attack-row').forEach(row => {
            const attack = {
                name: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="name"]'))?.value || '',
                stat: /** @type {HTMLSelectElement} */ (row.querySelector('[data-field="stat"]'))?.value || 'str',
                bonusDamage: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="bonusDamage"]'))?.value || '',
                damage: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="damage"]'))?.value || ''
            };
            attacks.push(attack);
        });
        setNestedValue(state, 'attacks', attacks);
        debouncedUpdate();
    }

    function loadAttacks() {
        const attacks = getNestedValue(state, 'attacks') || [];
        if (attacksContainer) {
            attacksContainer.innerHTML = '';
            attacks.forEach(/** @param {any} attack */ (attack) => {
                attacksContainer.appendChild(createAttackRow(attack));
            });
        }
    }

    addAttackBtn?.addEventListener('click', () => {
        if (attacksContainer) {
            attacksContainer.appendChild(createAttackRow());
            saveAttacks();
        }
    });

    // ========== Dynamic Spells ==========
    /** @type {Record<string, number>} */
    let spellCounters = {};

    /**
     * @param {any} level
     * @param {any} spellData
     */
    function createSpellEntry(level, spellData = {}) {
        // @ts-ignore
        if (!spellCounters[level]) spellCounters[level] = 0;
        // @ts-ignore
        const spellId = spellCounters[level]++;

        const div = document.createElement('div');
        div.className = 'spell-entry';
        div.dataset.level = level;
        div.dataset.spellId = spellId.toString();

        // @ts-ignore
        div.innerHTML = `
            <input type="checkbox" ${spellData.prepared ? 'checked' : ''} data-field="prepared" title="Prepared" />
            <input type="text" placeholder="Spell name" value="${spellData.name || ''}" data-field="name" />
            <button type="button" class="delete-spell">×</button>
        `;

        // Add event listeners
        div.querySelectorAll('input').forEach(el => {
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(eventType, () => saveSpells());
        });

        div.querySelector('.delete-spell')?.addEventListener('click', () => {
            div.remove();
            saveSpells();
        });

        return div;
    }

    function saveSpells() {
        /** @type {Record<string, any[]>} */
        const spellsByLevel = {};
        for (let i = 0; i <= 9; i++) {
            const container = document.getElementById(`spells-level${i}`);
            /** @type {any[]} */
            const spells = [];
            container?.querySelectorAll('.spell-entry').forEach(entry => {
                const spell = {
                    name: /** @type {HTMLInputElement} */ (entry.querySelector('[data-field="name"]'))?.value || '',
                    prepared: /** @type {HTMLInputElement} */ (entry.querySelector('[data-field="prepared"]'))?.checked || false
                };
                // Keep all spells including empty ones
                spells.push(spell);
            });
            if (spells.length > 0) {
                spellsByLevel[`level${i}`] = spells;
            }
        }
        setNestedValue(state, 'spells', spellsByLevel);
        debouncedUpdate();
    }

    function loadSpells() {
        const spellsByLevel = getNestedValue(state, 'spells') || {};
        for (let i = 0; i <= 9; i++) {
            const container = document.getElementById(`spells-level${i}`);
            if (container) {
                container.innerHTML = '';
                // @ts-ignore
                const spells = spellsByLevel[`level${i}`] || [];
                spells.forEach(/** @param {any} spell */ (spell) => {
                    container.appendChild(createSpellEntry(i.toString(), spell));
                });
            }
        }
    }

    // Add spell buttons
    document.querySelectorAll('.add-spell-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.getAttribute('data-level');
            if (level) {
                const container = document.getElementById(`spells-level${level}`);
                if (container) {
                    container.appendChild(createSpellEntry(level));
                    saveSpells();
                }
            }
        });
    });

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });

}());
