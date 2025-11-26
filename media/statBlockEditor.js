(function() {
    const vscode = acquireVsCodeApi();
    let currentData = getDefaultMonster();

    // Default monster structure matching the Monster interface
    function getDefaultMonster() {
        return {
            name: 'New Monster',
            size: 'M',
            type: 'humanoid',
            subtype: '',
            alignment: 'neutral',
            ac: 10,
            acType: '',
            hp: 10,
            hitDice: '2d8',
            speed: '30 ft.',
            stats: {
                str: 10,
                dex: 10,
                con: 10,
                int: 10,
                wis: 10,
                cha: 10
            },
            saves: [],
            skills: [],
            damageVulnerabilities: [],
            damageResistances: [],
            damageImmunities: [],
            conditionImmunities: [],
            senses: 'passive Perception 10',
            languages: 'Common',
            cr: '0',
            xp: 0,
            proficiencyBonus: 2,
            traits: [],
            actions: [],
            reactions: [],
            legendaryActions: [],
            legendaryDescription: '',
            description: '',
            source: ''
        };
    }

    // CR to XP mapping
    const CR_XP_MAP = {
        '0': 0, '1/8': 25, '1/4': 50, '1/2': 100,
        '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
        '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
        '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
        '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
        '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
        '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000
    };

    // Size abbreviation to full name
    const SIZE_MAP = {
        'T': 'Tiny', 'S': 'Small', 'M': 'Medium',
        'L': 'Large', 'H': 'Huge', 'G': 'Gargantuan'
    };

    function calculateModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    function formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    // Convert newlines to HTML line breaks for display
    function formatDescription(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // Extract text from contenteditable element, converting br tags back to newlines
    function extractDescription(element) {
        // Get innerHTML and convert br tags to newlines
        let html = element.innerHTML;
        // Handle various br formats
        html = html.replace(/<br\s*\/?>/gi, '\n');
        // Create a temporary element to decode HTML entities and strip remaining tags
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || '';
    }

    // Migrate old editor format to new Monster interface format
    function migrateData(data) {
        // Migrate from old editor format (abilityScores) to Monster format (stats)
        if (data.abilityScores && !data.stats) {
            data.stats = {
                str: data.abilityScores.strength || 10,
                dex: data.abilityScores.dexterity || 10,
                con: data.abilityScores.constitution || 10,
                int: data.abilityScores.intelligence || 10,
                wis: data.abilityScores.wisdom || 10,
                cha: data.abilityScores.charisma || 10
            };
            delete data.abilityScores;
        }

        // Migrate armorClass to ac
        if (data.armorClass !== undefined && data.ac === undefined) {
            data.ac = data.armorClass;
            delete data.armorClass;
        }

        // Migrate armorType to acType
        if (data.armorType !== undefined && data.acType === undefined) {
            data.acType = data.armorType;
            delete data.armorType;
        }

        // Migrate hitPoints to hp
        if (data.hitPoints !== undefined && data.hp === undefined) {
            data.hp = data.hitPoints;
            delete data.hitPoints;
        }

        // Migrate challengeRating to cr
        if (data.challengeRating !== undefined && data.cr === undefined) {
            data.cr = data.challengeRating;
            delete data.challengeRating;
        }

        // Migrate speed from object to string
        if (data.speed && typeof data.speed === 'object' && !Array.isArray(data.speed)) {
            const speeds = [];
            if (data.speed.walk) speeds.push(`${data.speed.walk} ft.`);
            if (data.speed.fly) speeds.push(`fly ${data.speed.fly} ft.`);
            if (data.speed.swim) speeds.push(`swim ${data.speed.swim} ft.`);
            if (data.speed.burrow) speeds.push(`burrow ${data.speed.burrow} ft.`);
            if (data.speed.climb) speeds.push(`climb ${data.speed.climb} ft.`);
            data.speed = speeds.join(', ') || '30 ft.';
        }

        // Migrate speed from array format to string
        if (Array.isArray(data.speed)) {
            data.speed = data.speed.map(s =>
                s.name === 'walk' ? s.description : `${s.name} ${s.description}`
            ).join(', ') || '30 ft.';
        }

        // Migrate skills from object or array to string array
        if (data.skills && !Array.isArray(data.skills)) {
            data.skills = Object.entries(data.skills).map(([name, bonus]) =>
                `${name} ${formatModifier(bonus)}`
            );
        } else if (Array.isArray(data.skills) && data.skills.length > 0 && typeof data.skills[0] === 'object') {
            data.skills = data.skills.map(s => `${s.name} ${s.description}`);
        }

        // Migrate saves from object (savingThrows) to string array
        if (data.savingThrows && !data.saves) {
            data.saves = Object.entries(data.savingThrows).map(([ability, bonus]) => {
                const abbr = ability.substring(0, 3).toUpperCase();
                return `${abbr} ${formatModifier(bonus)}`;
            });
            delete data.savingThrows;
        }

        // Migrate senses from object or array to string
        if (data.senses && typeof data.senses === 'object' && !Array.isArray(data.senses)) {
            const senses = [];
            if (data.senses.darkvision) senses.push(`darkvision ${data.senses.darkvision} ft.`);
            if (data.senses.blindsight) senses.push(`blindsight ${data.senses.blindsight} ft.`);
            if (data.senses.tremorsense) senses.push(`tremorsense ${data.senses.tremorsense} ft.`);
            if (data.senses.truesight) senses.push(`truesight ${data.senses.truesight} ft.`);
            senses.push(`passive Perception ${data.senses.passive_perception || 10}`);
            data.senses = senses.join(', ');
        } else if (Array.isArray(data.senses)) {
            data.senses = data.senses.map(s =>
                s.name === 'passive Perception' ? `passive Perception ${s.description}` : `${s.name} ${s.description}`
            ).join(', ');
        }

        // Migrate languages from array to string
        if (Array.isArray(data.languages)) {
            data.languages = data.languages.join(', ') || 'None';
        }

        // Ensure arrays exist
        data.saves = data.saves || [];
        data.skills = data.skills || [];
        data.damageVulnerabilities = data.damageVulnerabilities || [];
        data.damageResistances = data.damageResistances || [];
        data.damageImmunities = data.damageImmunities || [];
        data.conditionImmunities = data.conditionImmunities || [];
        data.traits = data.traits || [];
        data.actions = data.actions || [];
        data.reactions = data.reactions || [];
        data.legendaryActions = data.legendaryActions || [];

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
                    currentData = { ...getDefaultMonster(), ...migrated };
                } catch {
                    currentData = getDefaultMonster();
                }
                renderStatBlock();
                break;
        }
    });

    function renderStatBlock() {
        const container = document.getElementById('stat-block');

        const stats = currentData.stats;
        const strMod = calculateModifier(stats.str);
        const dexMod = calculateModifier(stats.dex);
        const conMod = calculateModifier(stats.con);
        const intMod = calculateModifier(stats.int);
        const wisMod = calculateModifier(stats.wis);
        const chaMod = calculateModifier(stats.cha);

        // Get display size
        const displaySize = SIZE_MAP[currentData.size] || currentData.size;

        container.innerHTML = `
            <div class="stat-block-header">
                <h1 contenteditable="true" data-field="name">${currentData.name}</h1>
                <p class="creature-type">
                    <span contenteditable="true" data-field="size">${displaySize}</span>
                    <span contenteditable="true" data-field="type">${currentData.type}</span>${currentData.subtype ? ` (<span contenteditable="true" data-field="subtype">${currentData.subtype}</span>)` : ''}, <span contenteditable="true" data-field="alignment">${currentData.alignment}</span>
                </p>
            </div>
            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="stat-block-section">
                <div class="stat-row">
                    <span class="stat-label">Armor Class</span>
                    <span contenteditable="true" data-field="ac">${currentData.ac}</span>
                    ${currentData.acType ? `<span contenteditable="true" data-field="acType" class="armor-type">(${currentData.acType})</span>` : ''}
                </div>
                <div class="stat-row">
                    <span class="stat-label">Hit Points</span>
                    <span contenteditable="true" data-field="hp">${currentData.hp}</span>
                    <span class="hit-dice">(<span contenteditable="true" data-field="hitDice">${currentData.hitDice}</span>)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Speed</span>
                    <span contenteditable="true" data-field="speed">${currentData.speed}</span>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="ability-scores">
                <div class="ability-score" data-ability="str">
                    <div class="ability-name">STR</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.str">${stats.str}</div>
                    <div class="ability-modifier">${formatModifier(strMod)}</div>
                </div>
                <div class="ability-score" data-ability="dex">
                    <div class="ability-name">DEX</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.dex">${stats.dex}</div>
                    <div class="ability-modifier">${formatModifier(dexMod)}</div>
                </div>
                <div class="ability-score" data-ability="con">
                    <div class="ability-name">CON</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.con">${stats.con}</div>
                    <div class="ability-modifier">${formatModifier(conMod)}</div>
                </div>
                <div class="ability-score" data-ability="int">
                    <div class="ability-name">INT</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.int">${stats.int}</div>
                    <div class="ability-modifier">${formatModifier(intMod)}</div>
                </div>
                <div class="ability-score" data-ability="wis">
                    <div class="ability-name">WIS</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.wis">${stats.wis}</div>
                    <div class="ability-modifier">${formatModifier(wisMod)}</div>
                </div>
                <div class="ability-score" data-ability="cha">
                    <div class="ability-name">CHA</div>
                    <div class="ability-value" contenteditable="true" data-field="stats.cha">${stats.cha}</div>
                    <div class="ability-modifier">${formatModifier(chaMod)}</div>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            <div class="stat-block-section">
                ${currentData.saves && currentData.saves.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Saving Throws</span>
                        <span contenteditable="true" data-field="saves">${currentData.saves.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.skills && currentData.skills.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Skills</span>
                        <span contenteditable="true" data-field="skills">${currentData.skills.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.damageVulnerabilities && currentData.damageVulnerabilities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Vulnerabilities</span>
                        <span contenteditable="true" data-field="damageVulnerabilities">${currentData.damageVulnerabilities.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.damageResistances && currentData.damageResistances.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Resistances</span>
                        <span contenteditable="true" data-field="damageResistances">${currentData.damageResistances.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.damageImmunities && currentData.damageImmunities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Damage Immunities</span>
                        <span contenteditable="true" data-field="damageImmunities">${currentData.damageImmunities.join(', ')}</span>
                    </div>
                ` : ''}
                ${currentData.conditionImmunities && currentData.conditionImmunities.length > 0 ? `
                    <div class="stat-row">
                        <span class="stat-label">Condition Immunities</span>
                        <span contenteditable="true" data-field="conditionImmunities">${currentData.conditionImmunities.join(', ')}</span>
                    </div>
                ` : ''}
                <div class="stat-row">
                    <span class="stat-label">Senses</span>
                    <span contenteditable="true" data-field="senses">${currentData.senses}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Languages</span>
                    <span contenteditable="true" data-field="languages">${currentData.languages}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Challenge</span>
                    <span contenteditable="true" data-field="cr">${currentData.cr}</span>
                    <span class="xp">(<span contenteditable="true" data-field="xp">${currentData.xp}</span> XP)</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Proficiency Bonus</span>
                    <span contenteditable="true" data-field="proficiencyBonus">${formatModifier(currentData.proficiencyBonus)}</span>
                </div>
            </div>

            <svg height="5" width="100%" class="divider"><polyline points="0,0 400,2.5 0,5"></polyline></svg>

            ${currentData.traits && currentData.traits.length > 0 ? `
                <div class="actions-header">
                    <h3>Traits <button class="add-section-btn" id="add-trait">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.traits.map((trait, idx) => `
                        <div class="feature" data-section="traits" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${trait.name}.</strong> <span class="feature-text" contenteditable="true">${formatDescription(trait.description)}</span></p>
                            <button class="remove-feature" data-section="traits" data-index="${idx}">×</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="actions-header">
                    <h3>Traits <button class="add-section-btn" id="add-trait">+</button></h3>
                </div>
            `}

            <div class="actions-header">
                <h3>Actions <button class="add-section-btn" id="add-action">+</button></h3>
            </div>

            <div class="stat-block-section">
                ${currentData.actions && currentData.actions.map((action, idx) => `
                    <div class="feature" data-section="actions" data-index="${idx}">
                        <p><strong class="feature-name" contenteditable="true">${action.name}.</strong> <span class="feature-text" contenteditable="true">${formatDescription(action.description)}</span></p>
                        <button class="remove-feature" data-section="actions" data-index="${idx}">×</button>
                    </div>
                `).join('') || ''}
                ${!currentData.actions || currentData.actions.length === 0 ? '<p class="empty-section">No actions defined</p>' : ''}
            </div>

            ${currentData.reactions && currentData.reactions.length > 0 ? `
                <div class="actions-header">
                    <h3>Reactions <button class="add-section-btn" id="add-reaction">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.reactions.map((reaction, idx) => `
                        <div class="feature" data-section="reactions" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${reaction.name}.</strong> <span class="feature-text" contenteditable="true">${formatDescription(reaction.description)}</span></p>
                            <button class="remove-feature" data-section="reactions" data-index="${idx}">×</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <div class="actions-header">
                    <h3>Reactions <button class="add-section-btn" id="add-reaction">+</button></h3>
                </div>
            `}

            ${currentData.legendaryActions && currentData.legendaryActions.length > 0 ? `
                <div class="actions-header">
                    <h3>Legendary Actions <button class="add-section-btn" id="add-legendary">+</button></h3>
                </div>
                <div class="stat-block-section">
                    ${currentData.legendaryDescription ? `<p class="legendary-description">${formatDescription(currentData.legendaryDescription)}</p>` : ''}
                    ${currentData.legendaryActions.map((action, idx) => `
                        <div class="feature" data-section="legendaryActions" data-index="${idx}">
                            <p><strong class="feature-name" contenteditable="true">${action.name}.</strong> <span class="feature-text" contenteditable="true">${formatDescription(action.description)}</span></p>
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
            if (!currentData.traits) currentData.traits = [];
            currentData.traits.push({ name: 'New Trait', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-action')?.addEventListener('click', () => {
            if (!currentData.actions) currentData.actions = [];
            currentData.actions.push({ name: 'New Action', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-reaction')?.addEventListener('click', () => {
            if (!currentData.reactions) currentData.reactions = [];
            currentData.reactions.push({ name: 'New Reaction', description: 'Description' });
            saveAndUpdate();
        });

        document.getElementById('add-legendary')?.addEventListener('click', () => {
            if (!currentData.legendaryActions) currentData.legendaryActions = [];
            currentData.legendaryActions.push({ name: 'New Legendary Action', description: 'Description' });
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
                currentData[section][index].description = extractDescription(e.target);
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

        // Handle array fields (comma-separated strings)
        if (['saves', 'skills', 'damageVulnerabilities', 'damageResistances', 'damageImmunities', 'conditionImmunities'].includes(lastKey)) {
            obj[lastKey] = value.split(',').map(s => s.trim()).filter(s => s);
        }
        // Keep string fields as strings
        else if (['cr', 'hitDice', 'acType', 'speed', 'senses', 'languages', 'name', 'type', 'subtype', 'alignment', 'size', 'description', 'source', 'legendaryDescription'].includes(lastKey)) {
            obj[lastKey] = value;
        }
        // Parse numbers for numeric fields
        else {
            const numValue = parseInt(value);
            obj[lastKey] = isNaN(numValue) ? value : numValue;
        }

        // Auto-calculate XP when CR changes
        if (lastKey === 'cr') {
            currentData.xp = CR_XP_MAP[value] || 0;
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
