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
            languages: [],
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

    // Listen for messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                try {
                    const parsed = JSON.parse(message.text);
                    currentData = { ...getDefaultStatBlock(), ...parsed };
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
        let speedParts = [];
        if (currentData.speed.walk) speedParts.push(`<span contenteditable="true" data-speed="walk">${currentData.speed.walk}</span> ft.`);
        if (currentData.speed.fly > 0) speedParts.push(`fly <span contenteditable="true" data-speed="fly">${currentData.speed.fly}</span> ft. <button class="remove-speed" data-speed="fly">×</button>`);
        if (currentData.speed.swim > 0) speedParts.push(`swim <span contenteditable="true" data-speed="swim">${currentData.speed.swim}</span> ft. <button class="remove-speed" data-speed="swim">×</button>`);
        if (currentData.speed.burrow > 0) speedParts.push(`burrow <span contenteditable="true" data-speed="burrow">${currentData.speed.burrow}</span> ft. <button class="remove-speed" data-speed="burrow">×</button>`);
        if (currentData.speed.climb > 0) speedParts.push(`climb <span contenteditable="true" data-speed="climb">${currentData.speed.climb}</span> ft. <button class="remove-speed" data-speed="climb">×</button>`);
        const speedStr = speedParts.join(', ');

        // Build senses string with editable sections
        let sensesParts = [];
        if (currentData.senses.darkvision > 0) sensesParts.push(`darkvision <span contenteditable="true" data-sense="darkvision">${currentData.senses.darkvision}</span> ft. <button class="remove-sense" data-sense="darkvision">×</button>`);
        if (currentData.senses.blindsight > 0) sensesParts.push(`blindsight <span contenteditable="true" data-sense="blindsight">${currentData.senses.blindsight}</span> ft. <button class="remove-sense" data-sense="blindsight">×</button>`);
        if (currentData.senses.tremorsense > 0) sensesParts.push(`tremorsense <span contenteditable="true" data-sense="tremorsense">${currentData.senses.tremorsense}</span> ft. <button class="remove-sense" data-sense="tremorsense">×</button>`);
        if (currentData.senses.truesight > 0) sensesParts.push(`truesight <span contenteditable="true" data-sense="truesight">${currentData.senses.truesight}</span> ft. <button class="remove-sense" data-sense="truesight">×</button>`);
        sensesParts.push(`passive Perception <span contenteditable="true" data-sense="passive_perception">${currentData.senses.passive_perception}</span>`);
        const sensesStr = sensesParts.join(', ');

        // Build skills string with editable values
        let skillsHtml = '';
        const skillEntries = Object.entries(currentData.skills).map(([skill, bonus]) =>
            `<span class="skill-entry" style="position: relative; display: inline-block; margin-right: 8px;"><span class="skill-name" contenteditable="true" data-skill-name="${skill}">${skill}</span> <span contenteditable="true" data-skill="${skill}">${formatModifier(bonus)}</span> <button class="remove-skill" data-skill="${skill}">×</button></span>`
        ).join(' ');
        skillsHtml = `
            <div class="stat-row">
                <span class="stat-label">Skills <button class="add-inline-btn" id="add-skill">+</button></span>
                <span class="skills-list">${Object.keys(currentData.skills).length > 0 ? skillEntries : '—'}</span>
            </div>
        `;

        // Build languages string with editable list
        let languagesHtml = '';
        if (currentData.languages.length > 0) {
            const langEntries = currentData.languages.map((lang, idx) =>
                `<span class="language-entry"><span contenteditable="true" data-language-idx="${idx}">${lang}</span> <button class="remove-language" data-language-idx="${idx}">×</button></span>`
            ).join(', ');
            languagesHtml = langEntries;
        } else {
            languagesHtml = '—';
        }

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

        // Handle speed editing
        document.querySelectorAll('[data-speed]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const speedType = e.target.getAttribute('data-speed');
                const value = parseInt(e.target.textContent) || 0;
                currentData.speed[speedType] = value;
                saveAndUpdate();
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Handle sense editing
        document.querySelectorAll('[data-sense]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const senseType = e.target.getAttribute('data-sense');
                const value = parseInt(e.target.textContent) || 0;
                currentData.senses[senseType] = value;
                saveAndUpdate();
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Handle skill editing
        document.querySelectorAll('[data-skill]:not(button)').forEach(element => {
            element.addEventListener('blur', (e) => {
                const skillName = e.target.getAttribute('data-skill');
                const text = e.target.textContent.trim();
                // Parse modifier (e.g., "+6" or "-2")
                const value = parseInt(text.replace('+', '')) || 0;
                currentData.skills[skillName] = value;
                saveAndUpdate();
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });

        // Handle language editing
        document.querySelectorAll('[data-language-idx]:not(button)').forEach(element => {
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

        // Remove buttons
        document.querySelectorAll('.remove-skill').forEach(button => {
            button.addEventListener('click', (e) => {
                const skill = e.target.getAttribute('data-skill');
                delete currentData.skills[skill];
                saveAndUpdate();
            });
        });

        document.querySelectorAll('.remove-language').forEach(button => {
            button.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-language-idx'));
                currentData.languages.splice(idx, 1);
                saveAndUpdate();
            });
        });

        document.querySelectorAll('.remove-feature').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentData[section].splice(idx, 1);
                saveAndUpdate();
            });
        });

        document.querySelectorAll('.remove-speed').forEach(button => {
            button.addEventListener('click', (e) => {
                const speedType = e.target.getAttribute('data-speed');
                currentData.speed[speedType] = 0;
                saveAndUpdate();
            });
        });

        document.querySelectorAll('.remove-sense').forEach(button => {
            button.addEventListener('click', (e) => {
                const senseType = e.target.getAttribute('data-sense');
                currentData.senses[senseType] = 0;
                saveAndUpdate();
            });
        });

        // Handle skill name editing
        document.querySelectorAll('[data-skill-name]').forEach(element => {
            element.addEventListener('blur', (e) => {
                const oldName = e.target.getAttribute('data-skill-name');
                const newName = e.target.textContent.trim();
                if (newName && newName !== oldName) {
                    const value = currentData.skills[oldName];
                    delete currentData.skills[oldName];
                    currentData.skills[newName] = value;
                    saveAndUpdate();
                }
            });

            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
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

        document.getElementById('add-skill')?.addEventListener('click', () => {
            currentData.skills['Stealth'] = 2;
            saveAndUpdate();
        });

        document.getElementById('add-language')?.addEventListener('click', () => {
            currentData.languages.push('Common');
            saveAndUpdate();
        });

        document.getElementById('add-sense')?.addEventListener('click', () => {
            currentData.senses.darkvision = 60;
            saveAndUpdate();
        });

        document.getElementById('add-speed')?.addEventListener('click', () => {
            currentData.speed.fly = 30;
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
