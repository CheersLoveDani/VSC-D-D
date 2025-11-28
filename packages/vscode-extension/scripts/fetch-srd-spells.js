// Script to fetch SRD spells from the D&D 5e API and save as bundled JSON
// Run with: node scripts/fetch-srd-spells.js

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

const SCHOOL_MAP = {
    'abjuration': 'Abjuration',
    'conjuration': 'Conjuration',
    'divination': 'Divination',
    'enchantment': 'Enchantment',
    'evocation': 'Evocation',
    'illusion': 'Illusion',
    'necromancy': 'Necromancy',
    'transmutation': 'Transmutation'
};

async function fetchAllSpells() {
    console.log('Fetching spell list...');
    const list = await fetch(`${API_BASE}/api/2014/spells`);
    console.log(`Found ${list.count} spells`);

    const spells = [];
    let count = 0;

    for (const spellRef of list.results) {
        try {
            const spell = await fetch(`${API_BASE}${spellRef.url}`);

            // Transform to our format
            const transformed = {
                name: spell.name,
                level: spell.level,
                school: SCHOOL_MAP[spell.school?.index] || spell.school?.name || 'Unknown',
                castingTime: spell.casting_time || '1 action',
                range: spell.range || 'Self',
                components: formatComponents(spell),
                duration: spell.duration || 'Instantaneous',
                description: formatDescription(spell.desc),
                higherLevels: spell.higher_level?.join('\n') || undefined,
                classes: spell.classes?.map(c => c.name) || [],
                ritual: spell.ritual || false,
                concentration: spell.concentration || false,
                source: 'SRD 5.1',
                damage: formatDamage(spell)
            };

            spells.push(transformed);
            count++;

            if (count % 50 === 0) {
                console.log(`Processed ${count}/${list.count} spells...`);
            }

            // Small delay to be nice to the API
            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Error fetching ${spellRef.name}:`, error.message);
        }
    }

    return spells;
}

function formatComponents(spell) {
    const parts = [];
    if (spell.components?.includes('V')) parts.push('V');
    if (spell.components?.includes('S')) parts.push('S');
    if (spell.components?.includes('M')) {
        if (spell.material) {
            parts.push(`M (${spell.material})`);
        } else {
            parts.push('M');
        }
    }
    return parts.join(', ');
}

function formatDescription(desc) {
    if (!desc) return '';
    if (Array.isArray(desc)) {
        return desc.join('\n\n');
    }
    return desc;
}

function formatDamage(spell) {
    if (!spell.damage) return undefined;

    const damage = {
        type: spell.damage.damage_type?.name?.toLowerCase() || '',
        dice: {}
    };

    // Handle damage at slot level
    if (spell.damage.damage_at_slot_level) {
        for (const [level, dice] of Object.entries(spell.damage.damage_at_slot_level)) {
            damage.dice[parseInt(level)] = dice;
        }
    }

    // Handle damage at character level (for cantrips)
    if (spell.damage.damage_at_character_level) {
        for (const [level, dice] of Object.entries(spell.damage.damage_at_character_level)) {
            damage.dice[parseInt(level)] = dice;
        }
    }

    return Object.keys(damage.dice).length > 0 ? damage : undefined;
}

async function main() {
    try {
        const spells = await fetchAllSpells();

        const output = {
            version: '1.0',
            source: 'D&D 5e SRD API (https://www.dnd5eapi.co)',
            license: 'Open Gaming License (OGL)',
            fetchedAt: new Date().toISOString(),
            count: spells.length,
            spells: spells.sort((a, b) => a.name.localeCompare(b.name))
        };

        const outputPath = path.join(__dirname, '..', 'src', 'data', 'srd-spells.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        console.log(`\nSuccess! Saved ${spells.length} spells to ${outputPath}`);
        console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
