(function() {
    const vscode = acquireVsCodeApi();
    let currentData = getDefaultStatBlock();

    // Default stat block structure based on D&D 5e format
    function getDefaultStatBlock() {
        return {
            name: 'New Monster',
            size: 'Medium',
            type: 'humanoid',
            subtype: '',
            alignment: 'neutral',
            armorClass: 10,
            armorType: 'natural armor',
            hitPoints: 10,
            hitDice: '2d8',
            speed: {
                walk: 30,
                fly: 0,
                swim: 0,
                burrow: 0,
                climb: 0
            },
            abilityScores: {
                strength: 10,
                dexterity: 10,
                constitution: 10,
                intelligence: 10,
                wisdom: 10,
                charisma: 10
            },
            savingThrows: {},
            skills: {},
            damageVulnerabilities: [],
            damageResistances: [],
            damageImmunities: [],
            conditionImmunities: [],
            senses: {
                darkvision: 0,
                blindsight: 0,
                tremorsense: 0,
                truesight: 0,
                passive_perception: 10
            },
            languages: [], // Array of strings
            challengeRating: '1/8',
            xp: 25,
            proficiencyBonus: 2,
            traits: [],
            actions: [],
            reactions: [],
            legendaryActions: [],
            lairActions: [],
            regionalEffects: [],
            spellcasting: null
        };
    }

    function calculateModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    function formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    // Migrate old data format to new format
    function migrateData(data) {
        // Migrate speed from object to array
        if (data.speed && !Array.isArray(data.speed)) {
            const speedArray = [];
            if (data.speed.walk) speedArray.push({ name: 'walk', description: `${data.speed.walk} ft.` });
            if (data.speed.fly) speedArray.push({ name: 'fly', description: `${data.speed.fly} ft.` });
            if (data.speed.swim) speedArray.push({ name: 'swim', description: `${data.speed.swim} ft.` });
            if (data.speed.burrow) speedArray.push({ name: 'burrow', description: `${data.speed.burrow} ft.` });
            if (data.speed.climb) speedArray.push({ name: 'climb', description: `${data.speed.climb} ft.` });
            data.speed = speedArray;
        }

        // Migrate skills from object to array
        if (data.skills && !Array.isArray(data.skills)) {
            data.skills = Object.entries(data.skills).map(([name, bonus]) => ({
                name: name,
                description: formatModifier(bonus)
            }));
        }

        // Migrate senses from object to array
        if (data.senses && !Array.isArray(data.senses)) {
            const sensesArray = [];
            if (data.senses.darkvision) sensesArray.push({ name: 'darkvision', description: `${data.senses.darkvision} ft.` });
            if (data.senses.blindsight) sensesArray.push({ name: 'blindsight', description: `${data.senses.blindsight} ft.` });
            if (data.senses.tremorsense) sensesArray.push({ name: 'tremorsense', description: `${data.senses.tremorsense} ft.` });
            if (data.senses.truesight) sensesArray.push({ name: 'truesight', description: `${data.senses.truesight} ft.` });
            if (data.senses.passive_perception) sensesArray.push({ name: 'passive Perception', description: `${data.senses.passive_perception}` });
            data.senses = sensesArray;
        }

        // Migrate languages - keep as string array for single field
        if (data.languages && data.languages.length > 0 && typeof data.languages[0] === 'object') {
            data.languages = data.languages.map(lang => lang.name || lang);
        }

        return data;
    }

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                try {
                    const parsed = JSON.parse(message.text);
                    const migrated = migrateData(parsed);
                    currentData = { ...getDefaultStatBlock(), ...migrated };
                } catch {
                    currentData = getDefaultStatBlock();
                }
                renderStatBlock();
                break;
        }
    });

    function renderStatBlock() {
        const container = document.getElementById('stat-block');

        const abilities = currentData.abilityScores;
        const strMod = calculateModifier(abilities.strength);
        const dexMod = calculateModifier(abilities.dexterity);
        const conMod = calculateModifier(abilities.constitution);
        const intMod = calculateModifier(abilities.intelligence);
        const wisMod = calculateModifier(abilities.wisdom);
        const chaMod = calculateModifier(abilities.charisma);

        // Build speed string with editable sections
        const speedStr = currentData.speed.map((s, idx) =>
            `<span contenteditable="true" data-section="speed" data-index="${idx}" data-part="name">${s.name}</span> <span contenteditable="true" data-section="speed" data-index="${idx}" data-part="description">${s.description}</span> <button class="remove-inline" data-section="speed" data-index="${idx}">×</button>`
        ).join(', ') || '—';

        // Build senses string with editable sections
        const sensesStr = currentData.senses.map((s, idx) =>
            `<span contenteditable="true" data-section="senses" data-index="${idx}" data-part="name">${s.name}</span> <span contenteditable="true" data-section="senses" data-index="${idx}" data-part="description">${s.description}</span> <button class="remove-inline" data-section="senses" data-index="${idx}">×</button>`
        ).join(', ') || '—';

        // Build skills string with editable values
        const skillsHtml = `
            <div class="stat-row">
                <span class="stat-label">Skills <button class="add-inline-btn" id="add-skill">+</button></span>
                <span class="skills-list">${currentData.skills.map((s, idx) =>
                    `<span contenteditable="true" data-section="skills" data-index="${idx}" data-part="name">${s.name}</span> <span contenteditable="true" data-section="skills" data-index="${idx}" data-part="description">${s.description}</span> <button class="remove-inline" data-section="skills" data-index="${idx}">×</button>`
                ).join(', ') || '—'}</span>
            </div>
        `;

        // Build languages string with editable list (single field)
        const languagesHtml = currentData.languages.map((lang, idx) =>
            `<span contenteditable="true" data-language-idx="${idx}">${lang}</span> <button class="remove-inline" data-section="languages" data-index="${idx}">×</button>`
        ).join(', ') || '—';

        container.innerHTML = `
            <div class="stat-block-header">
                <h1 contenteditable="true" data-field="name">${currentData.name}</h1>
                <p class="creature-type" contenteditable="true" data-field="type">
                    ${currentData.size} ${currentData.type}${currentData.subtype ? ` (${currentData.subtype})` : ''}, ${currentData.alignment}
                </p>
            </div>
            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="stat-block-section">
                <div class="stat-row">
                    <span class="stat-label">Armor Class</span>
                    <span contenteditable="true" data-field="armorClass">${currentData.armorClass}</span>
                    <span contenteditable="true" data-field="armorType" class="armor-type">(${currentData.armorType})</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Hit Points</span>
                    <span contenteditable="true" data-field="hitPoints">${currentData.hitPoints}</span>
                    <span class="hit-dice">(<span contenteditable="true" data-field="hitDice">${currentData.hitDice}</span>)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Speed <button class="add-inline-btn" id="add-speed">+</button></span>
                    <span class="speed-values">${speedStr}</span>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="ability-scores">
                <div class="ability-score" data-ability="strength">
                    <div class="ability-name">STR</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.strength">${abilities.strength}</div>
                    <div class="ability-modifier">${formatModifier(strMod)}</div>
                </div>
                <div class="ability-score" data-ability="dexterity">
                    <div class="ability-name">DEX</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.dexterity">${abilities.dexterity}</div>
                    <div class="ability-modifier">${formatModifier(dexMod)}</div>
                </div>
                <div class="ability-score" data-ability="constitution">
                    <div class="ability-name">CON</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.constitution">${abilities.constitution}</div>
                    <div class="ability-modifier">${formatModifier(conMod)}</div>
                </div>
                <div class="ability-score" data-ability="intelligence">
                    <div class="ability-name">INT</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.intelligence">${abilities.intelligence}</div>
                    <div class="ability-modifier">${formatModifier(intMod)}</div>
                </div>
                <div class="ability-score" data-ability="wisdom">
                    <div class="ability-name">WIS</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.wisdom">${abilities.wisdom}</div>
                    <div class="ability-modifier">${formatModifier(wisMod)}</div>
                </div>
                <div class="ability-score" data-ability="charisma">
                    <div class="ability-name">CHA</div>
                    <div class="ability-value" contenteditable="true" data-field="abilityScores.charisma">${abilities.charisma}</div>
                    <div class="ability-modifier">${formatModifier(chaMod)}</div>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="stat-block-section">
                ${Object.keys(currentData.savingThrows).length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Saving Throws</span>
                        <span>${Object.entries(currentData.savingThrows).map(([k, v]) => `${k.substring(0, 3).toUpperCase()} ${formatModifier(v)}`).join(', ')}</span>
                    </div>
                ` : ''}
                ${skillsHtml}
                ${currentData.damageVulnerabilities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Vulnerabilities</span>
                        <span>${currentData.damageVulnerabilities.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.damageResistances.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Resistances</span>
                        <span>${currentData.damageResistances.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.damageImmunities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Immunities</span>
                        <span>${currentData.damageImmunities.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.conditionImmunities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Condition Immunities</span>
                        <span>${currentData.conditionImmunities.join(', ')}</span>
                    </div>
                ` : ''}
                <div class="stat-row">
                    <span class="stat-label">Senses <button class="add-inline-btn" id="add-sense">+</button></span>
                    <span class="senses-values">${sensesStr}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Languages <button class="add-inline-btn" id="add-language">+</button></span>
                    <span class="languages-list">${languagesHtml}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Challenge</span>
                    <span contenteditable="true" data-field="challengeRating">${currentData.challengeRating}</span>
                    <span class="xp">(<span contenteditable="true" data-field="xp">${currentData.xp}</span> XP)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Proficiency Bonus</span>
                    <span contenteditable="true" data-field="proficiencyBonus">${formatModifier(currentData.proficiencyBonus)}</span>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            ${currentData.traits.length > 0 ? `
                <div class="actions-header">
                    <h3>Traits <button class="add-section-btn" id="add-trait">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.traits.map((trait, idx) => `
                        <div class="feature" data-section="traits" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${trait.name}.</strong> <span class="feature-text" contenteditable="true">${trait.description}</span></p>
                            <button class="remove-feature" data-section="traits" data-index="${idx}">×</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="actions-header">
                    <h3>Traits <button class="add-section-btn" id="add-trait">+</button></h3>
                </div>
            `}

            ${currentData.spellcasting ? `
                <div class="stat-block-section">
                    <div class="feature">
                        <p><strong class="feature-name">Spellcasting.</strong> <span class="feature-text">${currentData.spellcasting.description}</span></p>
                    </div>
                </div>
            ` : ''}

            <div class="actions-header">
                <h3>Actions <button class="add-section-btn" id="add-action">+</button></h3>
            </div>

            <div class="stat-block-section">
                ${currentData.actions.map((action, idx) => `
                    <div class="feature" data-section="actions" data-index="${idx}">
                        <p><strong class="feature-name" contenteditable="true">${action.name}.</strong> <span class="feature-text" contenteditable="true">${action.description}</span></p>
                        <button class="remove-feature" data-section="actions" data-index="${idx}">×</button>
                    </div>
                `).join('')}
                ${currentData.actions.length === 0 ? '<p class="empty-section">No actions defined</p>' : ''}
            </div>

            ${currentData.reactions.length > 0 ? `
                <div class="actions-header">
                    <h3>Reactions <button class="add-section-btn" id="add-reaction">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.reactions.map((reaction, idx) => `
                        <div class="feature" data-section="reactions" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${reaction.name}.</strong> <span class="feature-text" contenteditable="true">${reaction.description}</span></p>
                            <button class="remove-feature" data-section="reactions" data-index="${idx}">×</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="actions-header">
                    <h3>Reactions <button class="add-section-btn" id="add-reaction">+</button></h3>
                </div>
            `}

            ${currentData.legendaryActions.length > 0 ? `
                <div class="actions-header">
                    <h3>Legendary Actions <button class="add-section-btn" id="add-legendary">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.legendaryActions.map((action, idx) => `
                        <div class="feature" data-section="legendaryActions" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${action.name}.</strong> <span class="feature-text" contenteditable="true">${action.description}</span></p>
                            <button class="remove-feature" data-section="legendaryActions" data-index="${idx}">×</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="actions-header">
                    <h3>Legendary Actions <button class="add-section-btn" id="add-legendary">+</button></h3>
                </div>
            `}
        `;

        attachEventListeners();
    }

    function attachEventListeners() {
        // Handle contenteditable changes for basic fields
        document.querySelectorAll('[contenteditable="true"][data-field]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const field = e.target.getAttribute('data-field');
                if (field) {
                    updateField(field, e.target.textContent);
                }
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Handle inline editing for speed, skills, senses
        document.querySelectorAll('[data-section][data-part]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const section = e.target.getAttribute('data-section');
                const index = parseInt(e.target.getAttribute('data-index'));
                const part = e.target.getAttribute('data-part');
                currentData[section][index][part] = e.target.textContent.trim();
                saveAndUpdate();
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Handle language editing (single field)
        document.querySelectorAll('[data-language-idx]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const idx = parseInt(e.target.getAttribute('data-language-idx'));
                currentData.languages[idx] = e.target.textContent.trim();
                saveAndUpdate();
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Remove buttons for inline sections
        document.querySelectorAll('.remove-inline').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentData[section].splice(idx, 1);
                saveAndUpdate();
            });
        });

        // Remove buttons for feature sections
        document.querySelectorAll('.remove-feature').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentData[section].splice(idx, 1);
                saveAndUpdate();
            });
        });

        // Add buttons
        document.getElementById('add-trait')?.addEventListener('click', () => {
            currentData.traits.push({ name: 'New Trait', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-action')?.addEventListener('click', () => {
            currentData.actions.push({ name: 'New Action', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-reaction')?.addEventListener('click', () => {
            currentData.reactions.push({ name: 'New Reaction', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-legendary')?.addEventListener('click', () => {
            currentData.legendaryActions.push({ name: 'New Legendary Action', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-speed')?.addEventListener('click', () => {
            currentData.speed.push({ name: 'walk', description: '30 ft.' });
            saveAndUpdate();
        });

        document.getElementById('add-skill')?.addEventListener('click', () => {
            currentData.skills.push({ name: 'Stealth', description: '+5' });
            saveAndUpdate();
        });

        document.getElementById('add-sense')?.addEventListener('click', () => {
            currentData.senses.push({ name: 'darkvision', description: '60 ft.' });
            saveAndUpdate();
        });

        document.getElementById('add-language')?.addEventListener('click', () => {
            currentData.languages.push('Common');
            saveAndUpdate();
        });

        // Handle feature name/text changes
        document.querySelectorAll('.feature-name').forEach(element => {
            element.addEventListener('blur', (e) => {
                const feature = e.target.closest('.feature');
                const section = feature.getAttribute('data-section');
                const index = parseInt(feature.getAttribute('data-index'));
                currentData[section][index].name = e.target.textContent.replace('.', '');
                saveAndUpdate();
            });
        });

        document.querySelectorAll('.feature-text').forEach(element => {
            element.addEventListener('blur', (e) => {
                const feature = e.target.closest('.feature');
                const section = feature.getAttribute('data-section');
                const index = parseInt(feature.getAttribute('data-index'));
                currentData[section][index].description = e.target.textContent;
                saveAndUpdate();
            });
        });
    }

    function updateField(field, value) {
        const keys = field.split('.');
        let obj = currentData;

        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }

        const lastKey = keys[keys.length - 1];

        // Keep challengeRating and hitDice as strings, parse numbers for other fields
        if (lastKey === 'challengeRating' || lastKey === 'hitDice' || lastKey === 'armorType') {
            obj[lastKey] = value;
        } else {
            const numValue = parseInt(value);
            obj[lastKey] = isNaN(numValue) ? value : numValue;
        }

        saveAndUpdate();
    }

    function saveAndUpdate() {
        vscode.postMessage({
            type: 'updateData',
            data: currentData
        });
    }

    // Signal that the webview is ready
    vscode.postMessage({ type: 'ready' });
})();
