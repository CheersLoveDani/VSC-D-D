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

                    // Check if we're editing any input or if focus is inside an attack row
                    const activeElement = document.activeElement;
                    const isEditingInput = activeElement && (
                        inputs.includes(activeElement.id) ||
                        activeElement.closest('.attack-row') ||
                        activeElement.closest('.spell-entry')
                    );

                    // Only update UI if we are NOT currently editing
                    if (!isEditingInput) {
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


    // Icons
    const d20Icon = `<svg viewBox="0 0 3334 3334" version="1.1" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;"><path d="M1666.667,173.611l-1295.257,746.528l0,1493.056l1295.257,746.528l1295.257,-746.528l0,-1493.056l-1295.257,-746.528Z" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/><path d="M1666.667,173.611l-855,906.042l-440.257,1333.542l1295.257,185.035l1295.257,-185.035l-440.257,-1333.542l-855,-906.042Z" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/><path d="M1666.667,2598.229l-855,-1518.576l1710,0l-855,1518.576Z" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/><path d="M1666.667,2598.229l0,561.493" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/><path d="M811.667,1079.653l-440.257,-159.514" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/><path d="M2521.667,1079.653l440.257,-159.514" style="fill:none;fill-rule:nonzero;stroke:currentColor;stroke-width:166.67px;"/></svg>`;
    
    const swordIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>`;

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
            attackBonusEl.innerHTML = `${d20Icon} <span>${formatModifier(attackBonus)}</span>`;
        }

        // Damage Bonus = Ability Modifier + Bonus Damage
        const bonusDamageInput = /** @type {HTMLInputElement | null} */ (attackRow.querySelector('[data-field="bonusDamage"]'));
        const extraDamage = bonusDamageInput ? (parseInt(bonusDamageInput.value) || 0) : 0;
        const damageBonus = abilityMod + extraDamage;
        
        const damageBonusEl = attackRow.querySelector('[data-field="damageBonus"]');
        if (damageBonusEl) {
            damageBonusEl.innerHTML = `${swordIcon} <span>${formatModifier(damageBonus)}</span>`;
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
            <div class="attack-bonus-display" data-field="attackBonus">${d20Icon} <span>+0</span></div>
            <input type="text" placeholder="Bonus Dmg" value="${attackData.bonusDamage || ''}" data-field="bonusDamage" />
            <input type="text" placeholder="Damage/Type" value="${attackData.damage || ''}" data-field="damage" />
            <input type="text" placeholder="Dice (e.g. 2d6)" value="${attackData.dice || ''}" data-field="dice" />
            <div class="damage-bonus-display" data-field="damageBonus">${swordIcon} <span>+0</span></div>
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
                dice: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="dice"]'))?.value || '',
                damage: /** @type {HTMLInputElement} */ (row.querySelector('[data-field="damage"]'))?.value || ''
            };
            attacks.push(attack);
        });
        setNestedValue(state, 'attacks', attacks);
        debouncedUpdate();
    }

    function loadAttacks() {
        const attacks = getNestedValue(state, 'attacks') || [];
        if (!attacksContainer) return;

        // Get existing attack rows
        const existingRows = Array.from(attacksContainer.querySelectorAll('.attack-row'));

        // If the counts match, update existing rows instead of recreating
        if (existingRows.length === attacks.length) {
            existingRows.forEach((row, index) => {
                const attack = attacks[index];
                if (!attack) return;

                // Update each field only if not currently focused
                const nameInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="name"]'));
                if (nameInput && document.activeElement !== nameInput) {
                    nameInput.value = attack.name || '';
                }

                const statSelect = /** @type {HTMLSelectElement | null} */ (row.querySelector('[data-field="stat"]'));
                if (statSelect && document.activeElement !== statSelect) {
                    statSelect.value = attack.stat || 'str';
                }

                const bonusDamageInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="bonusDamage"]'));
                if (bonusDamageInput && document.activeElement !== bonusDamageInput) {
                    bonusDamageInput.value = attack.bonusDamage || '';
                }

                const diceInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="dice"]'));
                if (diceInput && document.activeElement !== diceInput) {
                    diceInput.value = attack.dice || '';
                }

                const damageInput = /** @type {HTMLInputElement | null} */ (row.querySelector('[data-field="damage"]'));
                if (damageInput && document.activeElement !== damageInput) {
                    damageInput.value = attack.damage || '';
                }

                // Update calculations
                updateAttackCalculations(/** @type {HTMLElement} */ (row));
            });
        } else {
            // Count doesn't match, rebuild all
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

    // ========== Spell Tooltip and Autocomplete ==========

    // Create tooltip element
    const spellTooltip = document.createElement('div');
    spellTooltip.className = 'spell-tooltip';
    spellTooltip.style.cssText = `
        position: fixed;
        background: var(--vscode-editor-background, #1e1e1e);
        border: 1px solid var(--vscode-panel-border, #454545);
        border-radius: 4px;
        padding: 12px;
        max-width: 400px;
        z-index: 10000;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-size: 12px;
        line-height: 1.4;
    `;
    document.body.appendChild(spellTooltip);

    // Create autocomplete dropdown
    const autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'spell-autocomplete';
    autocompleteDropdown.style.cssText = `
        position: fixed;
        background: var(--vscode-dropdown-background, #3c3c3c);
        border: 1px solid var(--vscode-dropdown-border, #454545);
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10001;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(autocompleteDropdown);

    /** @type {HTMLInputElement | null} */
    let activeSpellInput = null;
    let autocompleteRequestId = 0;
    /** @type {Record<string, any>} */
    const spellInfoCache = {};

    /**
     * Show spell tooltip near an element
     * @param {HTMLElement} element
     * @param {any} spellInfo
     */
    function showSpellTooltip(element, spellInfo) {
        const rect = element.getBoundingClientRect();

        let levelText = spellInfo.level === 0 ? 'Cantrip' : `Level ${spellInfo.level}`;
        let tags = [];
        if (spellInfo.concentration) tags.push('Concentration');
        if (spellInfo.ritual) tags.push('Ritual');

        let html = `
            <div style="font-weight: bold; font-size: 14px; color: var(--vscode-textLink-foreground, #3794ff); margin-bottom: 8px;">
                ${spellInfo.name}
            </div>
            <div style="font-style: italic; color: var(--vscode-descriptionForeground, #999); margin-bottom: 8px;">
                ${levelText} ${spellInfo.school}${tags.length ? ' (' + tags.join(', ') + ')' : ''}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin-bottom: 8px;">
                <span style="color: var(--vscode-descriptionForeground, #999);">Casting Time:</span>
                <span>${spellInfo.castingTime}</span>
                <span style="color: var(--vscode-descriptionForeground, #999);">Range:</span>
                <span>${spellInfo.range}</span>
                <span style="color: var(--vscode-descriptionForeground, #999);">Components:</span>
                <span>${spellInfo.components}</span>
                <span style="color: var(--vscode-descriptionForeground, #999);">Duration:</span>
                <span>${spellInfo.duration}</span>
            </div>
            <div style="border-top: 1px solid var(--vscode-panel-border, #454545); padding-top: 8px; max-height: 150px; overflow-y: auto;">
                ${spellInfo.description.substring(0, 500)}${spellInfo.description.length > 500 ? '...' : ''}
            </div>
        `;

        if (spellInfo.higherLevels) {
            html += `
                <div style="margin-top: 8px; font-style: italic; color: var(--vscode-descriptionForeground, #999);">
                    <strong>At Higher Levels:</strong> ${spellInfo.higherLevels.substring(0, 200)}${spellInfo.higherLevels.length > 200 ? '...' : ''}
                </div>
            `;
        }

        spellTooltip.innerHTML = html;
        spellTooltip.style.display = 'block';

        // Position tooltip
        let left = rect.left;
        let top = rect.bottom + 5;

        // Adjust if off-screen
        if (left + 400 > window.innerWidth) {
            left = window.innerWidth - 410;
        }
        if (top + spellTooltip.offsetHeight > window.innerHeight) {
            top = rect.top - spellTooltip.offsetHeight - 5;
        }

        spellTooltip.style.left = left + 'px';
        spellTooltip.style.top = top + 'px';
    }

    function hideSpellTooltip() {
        spellTooltip.style.display = 'none';
    }

    /**
     * Show autocomplete dropdown
     * @param {HTMLInputElement} input
     * @param {any[]} results
     */
    function showAutocomplete(input, results) {
        if (results.length === 0) {
            hideAutocomplete();
            return;
        }

        const rect = input.getBoundingClientRect();

        autocompleteDropdown.innerHTML = results.map((spell, index) => `
            <div class="autocomplete-item" data-index="${index}" data-name="${spell.name}" style="
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--vscode-panel-border, #333);
            ">
                <div style="font-weight: 500;">${spell.name}</div>
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground, #999);">
                    ${spell.level === 0 ? 'Cantrip' : 'Level ' + spell.level} ${spell.school}
                </div>
            </div>
        `).join('');

        autocompleteDropdown.style.display = 'block';
        autocompleteDropdown.style.left = rect.left + 'px';
        autocompleteDropdown.style.top = rect.bottom + 2 + 'px';
        autocompleteDropdown.style.width = Math.max(rect.width, 250) + 'px';

        // Add click handlers
        autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                if (name && activeSpellInput) {
                    activeSpellInput.value = name;
                    activeSpellInput.dispatchEvent(new Event('input', { bubbles: true }));
                    hideAutocomplete();
                    saveSpells();
                }
            });

            item.addEventListener('mouseenter', () => {
                // @ts-ignore
                item.style.background = 'var(--vscode-list-hoverBackground, #2a2d2e)';
            });
            item.addEventListener('mouseleave', () => {
                // @ts-ignore
                item.style.background = 'transparent';
            });
        });
    }

    function hideAutocomplete() {
        autocompleteDropdown.style.display = 'none';
    }

    /**
     * Request spell info from extension
     * @param {string} name
     * @param {function} callback
     */
    function requestSpellInfo(name, callback) {
        if (!name || name.trim().length === 0) return;

        // Check cache first
        const cacheKey = name.toLowerCase();
        if (spellInfoCache[cacheKey]) {
            callback(spellInfoCache[cacheKey]);
            return;
        }

        const requestId = ++autocompleteRequestId;

        // Listen for response
        const handler = (/** @type {MessageEvent} */ event) => {
            const message = event.data;
            if (message.type === 'spellInfo' && message.requestId === requestId) {
                window.removeEventListener('message', handler);
                if (message.found) {
                    spellInfoCache[cacheKey] = message.info;
                    callback(message.info);
                }
            }
        };
        window.addEventListener('message', handler);

        vscode.postMessage({
            type: 'getSpellInfo',
            requestId: requestId,
            name: name
        });
    }

    /**
     * Request spell search from extension
     * @param {string} query
     * @param {function} callback
     */
    function searchSpells(query, callback) {
        if (!query || query.trim().length < 2) {
            callback([]);
            return;
        }

        const requestId = ++autocompleteRequestId;

        const handler = (/** @type {MessageEvent} */ event) => {
            const message = event.data;
            if (message.type === 'spellSearchResults' && message.requestId === requestId) {
                window.removeEventListener('message', handler);
                callback(message.results);
            }
        };
        window.addEventListener('message', handler);

        vscode.postMessage({
            type: 'searchSpells',
            requestId: requestId,
            query: query
        });
    }

    // Debounced search
    /** @type {any} */
    let searchTimeout;
    function debouncedSearch(/** @type {HTMLInputElement} */ input) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = input.value.trim();
            if (query.length >= 2) {
                searchSpells(query, (/** @type {any[]} */ results) => {
                    if (document.activeElement === input) {
                        showAutocomplete(input, results);
                    }
                });
            } else {
                hideAutocomplete();
            }
        }, 150);
    }

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
            <input type="text" placeholder="Spell name" value="${spellData.name || ''}" data-field="name" class="spell-name-input" />
            <button type="button" class="delete-spell">×</button>
        `;

        const nameInput = /** @type {HTMLInputElement} */ (div.querySelector('[data-field="name"]'));

        // Add event listeners
        div.querySelectorAll('input').forEach(el => {
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(eventType, () => saveSpells());
        });

        // Autocomplete on typing
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                activeSpellInput = nameInput;
                debouncedSearch(nameInput);
            });

            nameInput.addEventListener('focus', () => {
                activeSpellInput = nameInput;
                if (nameInput.value.trim().length >= 2) {
                    debouncedSearch(nameInput);
                }
            });

            nameInput.addEventListener('blur', () => {
                // Delay to allow click on autocomplete
                setTimeout(() => {
                    if (activeSpellInput === nameInput) {
                        hideAutocomplete();
                    }
                }, 200);
            });

            // Show tooltip on hover if spell exists
            nameInput.addEventListener('mouseenter', () => {
                const spellName = nameInput.value.trim();
                if (spellName) {
                    requestSpellInfo(spellName, (/** @type {any} */ info) => {
                        if (info) {
                            showSpellTooltip(nameInput, info);
                        }
                    });
                }
            });

            nameInput.addEventListener('mouseleave', () => {
                hideSpellTooltip();
            });

            // Keyboard navigation for autocomplete
            nameInput.addEventListener('keydown', (e) => {
                if (autocompleteDropdown.style.display === 'none') return;

                const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
                const selected = autocompleteDropdown.querySelector('.autocomplete-item.selected');
                let selectedIndex = selected ? parseInt(selected.getAttribute('data-index') || '-1') : -1;

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    const item = items[selectedIndex];
                    const name = item?.getAttribute('data-name');
                    if (name) {
                        nameInput.value = name;
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                        hideAutocomplete();
                        saveSpells();
                    }
                    return;
                } else if (e.key === 'Escape') {
                    hideAutocomplete();
                    return;
                } else {
                    return;
                }

                // Update selection
                items.forEach((item, i) => {
                    if (i === selectedIndex) {
                        item.classList.add('selected');
                        // @ts-ignore
                        item.style.background = 'var(--vscode-list-activeSelectionBackground, #094771)';
                    } else {
                        item.classList.remove('selected');
                        // @ts-ignore
                        item.style.background = 'transparent';
                    }
                });
            });
        }

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
            if (!container) continue;

            // @ts-ignore
            const spells = spellsByLevel[`level${i}`] || [];
            const existingEntries = Array.from(container.querySelectorAll('.spell-entry'));

            // If counts match, update existing entries instead of recreating
            if (existingEntries.length === spells.length) {
                existingEntries.forEach((entry, index) => {
                    const spell = spells[index];
                    if (!spell) return;

                    const nameInput = /** @type {HTMLInputElement | null} */ (entry.querySelector('[data-field="name"]'));
                    if (nameInput && document.activeElement !== nameInput) {
                        nameInput.value = spell.name || '';
                    }

                    const preparedCheckbox = /** @type {HTMLInputElement | null} */ (entry.querySelector('[data-field="prepared"]'));
                    if (preparedCheckbox && document.activeElement !== preparedCheckbox) {
                        preparedCheckbox.checked = spell.prepared || false;
                    }
                });
            } else {
                // Count doesn't match, rebuild all
                container.innerHTML = '';
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
