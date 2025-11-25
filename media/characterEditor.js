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
        'hp.current', 'hp.max', 'hp.temp', 'ac', 'speed', 'hitDice', 'gold',
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

    // Signal that the webview is ready to receive data
    vscode.postMessage({ type: 'ready' });

}());
