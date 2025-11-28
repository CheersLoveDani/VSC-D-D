// Script to fetch SRD monsters from the D&D 5e API and save as bundled JSON
// Run with: node scripts/fetch-srd-monsters.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.dnd5eapi.co';

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Size abbreviation mapping
const SIZE_MAP = {
    'Tiny': 'T',
    'Small': 'S',
    'Medium': 'M',
    'Large': 'L',
    'Huge': 'H',
    'Gargantuan': 'G'
};

// CR to XP mapping
const CR_XP_MAP = {
    '0': 0,
    '1/8': 25,
    '1/4': 50,
    '1/2': 100,
    '1': 200,
    '2': 450,
    '3': 700,
    '4': 1100,
    '5': 1800,
    '6': 2300,
    '7': 2900,
    '8': 3900,
    '9': 5000,
    '10': 5900,
    '11': 7200,
    '12': 8400,
    '13': 10000,
    '14': 11500,
    '15': 13000,
    '16': 15000,
    '17': 18000,
    '18': 20000,
    '19': 22000,
    '20': 25000,
    '21': 33000,
    '22': 41000,
    '23': 50000,
    '24': 62000,
    '25': 75000,
    '26': 90000,
    '27': 105000,
    '28': 120000,
    '29': 135000,
    '30': 155000
};

async function fetchMonsters() {
    console.log('Fetching monster list...');
    const list = await fetch(`${API_BASE}/api/2014/monsters`);
    console.log(`Found ${list.count} monsters`);

    const monsters = [];
    let count = 0;

    for (const monsterRef of list.results) {
        try {
            const monster = await fetch(`${API_BASE}${monsterRef.url}`);
            const transformed = transformMonster(monster);
            if (transformed) {
                monsters.push(transformed);
            }
            count++;

            if (count % 50 === 0) {
                console.log(`Processed ${count}/${list.count} monsters...`);
            }

            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Error fetching ${monsterRef.name}:`, error.message);
        }
    }

    return monsters;
}

function formatSpeed(speedObj) {
    if (!speedObj) return '30 ft.';

    const speeds = [];
    if (speedObj.walk) speeds.push(`${speedObj.walk}`);
    if (speedObj.fly) speeds.push(`fly ${speedObj.fly}${speedObj.hover ? ' (hover)' : ''}`);
    if (speedObj.swim) speeds.push(`swim ${speedObj.swim}`);
    if (speedObj.burrow) speeds.push(`burrow ${speedObj.burrow}`);
    if (speedObj.climb) speeds.push(`climb ${speedObj.climb}`);

    return speeds.join(', ') || '0 ft.';
}

function formatSenses(sensesObj, passivePerception) {
    if (!sensesObj) return `passive Perception ${passivePerception || 10}`;

    const senses = [];
    if (sensesObj.darkvision) senses.push(`darkvision ${sensesObj.darkvision}`);
    if (sensesObj.blindsight) senses.push(`blindsight ${sensesObj.blindsight}`);
    if (sensesObj.tremorsense) senses.push(`tremorsense ${sensesObj.tremorsense}`);
    if (sensesObj.truesight) senses.push(`truesight ${sensesObj.truesight}`);
    senses.push(`passive Perception ${passivePerception || sensesObj.passive_perception || 10}`);

    return senses.join(', ');
}

function formatProficiencies(proficiencies) {
    const saves = [];
    const skills = [];

    for (const prof of proficiencies || []) {
        const name = prof.proficiency?.name || '';
        const value = prof.value || 0;
        const modifier = value >= 0 ? `+${value}` : `${value}`;

        if (name.startsWith('Saving Throw:')) {
            const ability = name.replace('Saving Throw: ', '');
            saves.push(`${ability} ${modifier}`);
        } else if (name.startsWith('Skill:')) {
            const skill = name.replace('Skill: ', '');
            skills.push(`${skill} ${modifier}`);
        }
    }

    return { saves, skills };
}

function formatAC(acArray) {
    if (!acArray || acArray.length === 0) return { value: 10, type: '' };

    const ac = acArray[0];
    let type = '';

    if (ac.armor && ac.armor.length > 0) {
        type = ac.armor.map(a => a.name).join(', ');
    } else if (ac.type && ac.type !== 'dex') {
        type = ac.type;
    }

    return { value: ac.value || 10, type };
}

function formatActions(actions) {
    if (!actions) return [];

    return actions.map(action => {
        let description = action.desc || '';

        // Add attack info if present
        if (action.attack_bonus !== undefined) {
            // Attack bonus is already included in description typically
        }

        // Add damage info if present
        if (action.damage && action.damage.length > 0) {
            // Damage is already included in description typically
        }

        return {
            name: action.name,
            description: description
        };
    });
}

function formatSpecialAbilities(abilities) {
    if (!abilities) return [];

    return abilities.map(ability => {
        let description = ability.desc || '';

        // Handle spellcasting specially
        if (ability.spellcasting) {
            const sc = ability.spellcasting;
            description = ability.desc || '';
            // The description already contains formatted spellcasting info from the API
        }

        return {
            name: ability.name,
            description: description
        };
    });
}

function transformMonster(monster) {
    const { saves, skills } = formatProficiencies(monster.proficiencies);
    const ac = formatAC(monster.armor_class);

    // Format CR (handle fractions)
    let cr = String(monster.challenge_rating);
    if (monster.challenge_rating === 0.125) cr = '1/8';
    else if (monster.challenge_rating === 0.25) cr = '1/4';
    else if (monster.challenge_rating === 0.5) cr = '1/2';

    // Get XP from the monster data or calculate from CR
    const xp = monster.xp || CR_XP_MAP[cr] || 0;

    return {
        name: monster.name,
        size: SIZE_MAP[monster.size] || 'M',
        type: monster.type || 'unknown',
        subtype: monster.subtype || undefined,
        alignment: monster.alignment || 'unaligned',
        ac: ac.value,
        acType: ac.type || undefined,
        hp: monster.hit_points || 1,
        hitDice: monster.hit_dice || '1d8',
        speed: formatSpeed(monster.speed),
        stats: {
            str: monster.strength || 10,
            dex: monster.dexterity || 10,
            con: monster.constitution || 10,
            int: monster.intelligence || 10,
            wis: monster.wisdom || 10,
            cha: monster.charisma || 10
        },
        saves: saves.length > 0 ? saves : undefined,
        skills: skills.length > 0 ? skills : undefined,
        damageVulnerabilities: monster.damage_vulnerabilities?.length > 0 ? monster.damage_vulnerabilities : undefined,
        damageResistances: monster.damage_resistances?.length > 0 ? monster.damage_resistances : undefined,
        damageImmunities: monster.damage_immunities?.length > 0 ? monster.damage_immunities : undefined,
        conditionImmunities: monster.condition_immunities?.map(c => c.name)?.length > 0
            ? monster.condition_immunities.map(c => c.name)
            : undefined,
        senses: formatSenses(monster.senses, monster.senses?.passive_perception),
        languages: monster.languages || 'None',
        cr: cr,
        xp: xp,
        proficiencyBonus: monster.proficiency_bonus || 2,
        traits: formatSpecialAbilities(monster.special_abilities),
        actions: formatActions(monster.actions),
        reactions: monster.reactions?.length > 0 ? formatActions(monster.reactions) : undefined,
        legendaryActions: monster.legendary_actions?.length > 0
            ? formatActions(monster.legendary_actions)
            : undefined,
        legendaryDescription: monster.legendary_actions?.length > 0
            ? `The ${monster.name.toLowerCase()} can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The ${monster.name.toLowerCase()} regains spent legendary actions at the start of its turn.`
            : undefined,
        source: 'SRD 5.1'
    };
}

async function main() {
    try {
        console.log('Starting SRD monsters fetch...\n');

        const monsters = await fetchMonsters();
        console.log(`\nFetched ${monsters.length} monsters\n`);

        // Sort alphabetically
        monsters.sort((a, b) => a.name.localeCompare(b.name));

        const output = {
            version: '1.0',
            source: 'D&D 5e SRD API (https://www.dnd5eapi.co)',
            license: 'Open Gaming License (OGL)',
            fetchedAt: new Date().toISOString(),
            count: monsters.length,
            monsters: monsters
        };

        const outputPath = path.join(__dirname, '..', 'src', 'data', 'srd-monsters.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        console.log(`Success! Saved ${monsters.length} monsters to ${outputPath}`);
        console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
