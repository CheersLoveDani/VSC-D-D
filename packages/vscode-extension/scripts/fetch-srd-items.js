// Script to fetch SRD items from the D&D 5e API and save as bundled JSON
// Run with: node scripts/fetch-srd-items.js

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

// Item category mapping
const CATEGORY_MAP = {
    'weapon': 'Weapon',
    'armor': 'Armor',
    'adventuring-gear': 'Adventuring Gear',
    'tools': 'Tool',
    'mounts-and-vehicles': 'Mount/Vehicle',
    'ammunition': 'Ammunition'
};

// Rarity normalization
const RARITY_MAP = {
    'common': 'Common',
    'uncommon': 'Uncommon',
    'rare': 'Rare',
    'very rare': 'Very Rare',
    'legendary': 'Legendary',
    'artifact': 'Artifact',
    'varies': 'Varies'
};

async function fetchEquipment() {
    console.log('Fetching equipment list...');
    const list = await fetch(`${API_BASE}/api/2014/equipment`);
    console.log(`Found ${list.count} equipment items`);

    const items = [];
    let count = 0;

    for (const itemRef of list.results) {
        try {
            const item = await fetch(`${API_BASE}${itemRef.url}`);
            const transformed = transformEquipment(item);
            if (transformed) {
                items.push(transformed);
            }
            count++;

            if (count % 50 === 0) {
                console.log(`Processed ${count}/${list.count} equipment...`);
            }

            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Error fetching ${itemRef.name}:`, error.message);
        }
    }

    return items;
}

async function fetchMagicItems() {
    console.log('Fetching magic items list...');
    const list = await fetch(`${API_BASE}/api/2014/magic-items`);
    console.log(`Found ${list.count} magic items`);

    const items = [];
    let count = 0;

    for (const itemRef of list.results) {
        try {
            const item = await fetch(`${API_BASE}${itemRef.url}`);
            const transformed = transformMagicItem(item);
            if (transformed) {
                items.push(transformed);
            }
            count++;

            if (count % 50 === 0) {
                console.log(`Processed ${count}/${list.count} magic items...`);
            }

            await new Promise(r => setTimeout(r, 50));
        } catch (error) {
            console.error(`Error fetching ${itemRef.name}:`, error.message);
        }
    }

    return items;
}

function transformEquipment(item) {
    const category = item.equipment_category?.index || 'adventuring-gear';
    const categoryName = CATEGORY_MAP[category] || item.equipment_category?.name || 'Adventuring Gear';

    // Determine subcategory/type
    let subtype = '';
    if (item.weapon_category) {
        subtype = `${item.weapon_category} ${item.weapon_range || ''} Weapon`.trim();
    } else if (item.armor_category) {
        subtype = `${item.armor_category} Armor`;
    } else if (item.gear_category) {
        subtype = item.gear_category.name || '';
    } else if (item.tool_category) {
        subtype = item.tool_category || '';
    } else if (item.vehicle_category) {
        subtype = item.vehicle_category || '';
    }

    // Build description from available fields
    let description = item.desc?.join('\n\n') || '';

    // Add weapon damage info to description
    if (item.damage) {
        const dmgStr = `Damage: ${item.damage.damage_dice} ${item.damage.damage_type?.name || ''}\n`;
        description = dmgStr + description;
    }

    // Add two-handed damage if present
    if (item.two_handed_damage) {
        const twoHandedStr = `Two-Handed Damage: ${item.two_handed_damage.damage_dice} ${item.two_handed_damage.damage_type?.name || ''}\n`;
        description = description ? description + '\n' + twoHandedStr : twoHandedStr;
    }

    // Add armor class info
    if (item.armor_class) {
        let acStr = `AC: ${item.armor_class.base}`;
        if (item.armor_class.dex_bonus) {
            acStr += item.armor_class.max_bonus ? ` + Dex (max ${item.armor_class.max_bonus})` : ' + Dex';
        }
        description = acStr + '\n' + description;
    }

    // Add special properties
    if (item.properties && item.properties.length > 0) {
        const propsStr = `Properties: ${item.properties.map(p => p.name).join(', ')}`;
        description = description ? description + '\n\n' + propsStr : propsStr;
    }

    // Add requirements
    if (item.str_minimum) {
        description += `\n\nRequires Strength ${item.str_minimum}`;
    }
    if (item.stealth_disadvantage) {
        description += '\nStealth Disadvantage';
    }

    return {
        name: item.name,
        type: categoryName,
        subtype: subtype || undefined,
        rarity: 'Common', // Regular equipment is common
        magic: false,
        attunement: false,
        weight: item.weight || 0,
        value: formatCost(item.cost),
        damage: item.damage ? {
            dice: item.damage.damage_dice,
            type: item.damage.damage_type?.name?.toLowerCase() || '',
            twoHanded: item.two_handed_damage?.damage_dice
        } : undefined,
        armorClass: item.armor_class ? {
            base: item.armor_class.base,
            dexBonus: item.armor_class.dex_bonus || false,
            maxBonus: item.armor_class.max_bonus
        } : undefined,
        properties: item.properties?.map(p => p.name) || [],
        range: item.range ? {
            normal: item.range.normal,
            long: item.range.long
        } : undefined,
        description: description.trim(),
        source: 'SRD 5.1'
    };
}

function transformMagicItem(item) {
    const category = item.equipment_category?.name || 'Wondrous Item';

    // Determine rarity
    const rarityRaw = item.rarity?.name?.toLowerCase() || 'uncommon';
    const rarity = RARITY_MAP[rarityRaw] || 'Uncommon';

    // Check for attunement
    const descText = item.desc?.join(' ') || '';
    const attunement = descText.toLowerCase().includes('requires attunement');

    // Extract attunement requirements if any
    let attunementRequirement = '';
    const attunementMatch = descText.match(/requires attunement(?: by (?:a |an )?([^.]+))?/i);
    if (attunementMatch && attunementMatch[1]) {
        attunementRequirement = attunementMatch[1].trim();
    }

    // Determine subcategory
    let subtype = category;
    if (item.equipment_category?.index === 'armor') {
        subtype = 'Magic Armor';
    } else if (item.equipment_category?.index === 'weapon') {
        subtype = 'Magic Weapon';
    } else if (category === 'Ring') {
        subtype = 'Ring';
    } else if (category === 'Rod') {
        subtype = 'Rod';
    } else if (category === 'Staff') {
        subtype = 'Staff';
    } else if (category === 'Wand') {
        subtype = 'Wand';
    } else if (category === 'Potion') {
        subtype = 'Potion';
    } else if (category === 'Scroll') {
        subtype = 'Scroll';
    }

    return {
        name: item.name,
        type: 'Wondrous Item',
        subtype: subtype,
        rarity: rarity,
        magic: true,
        attunement: attunement,
        attunementRequirement: attunementRequirement || undefined,
        weight: item.weight || 0,
        value: '', // Magic items typically don't have fixed values
        description: item.desc?.join('\n\n') || '',
        source: 'SRD 5.1'
    };
}

function formatCost(cost) {
    if (!cost) return '';
    return `${cost.quantity} ${cost.unit}`;
}

async function main() {
    try {
        console.log('Starting SRD items fetch...\n');

        const equipment = await fetchEquipment();
        console.log(`\nFetched ${equipment.length} equipment items\n`);

        const magicItems = await fetchMagicItems();
        console.log(`\nFetched ${magicItems.length} magic items\n`);

        // Combine and sort all items
        const allItems = [...equipment, ...magicItems].sort((a, b) => a.name.localeCompare(b.name));

        const output = {
            version: '1.0',
            source: 'D&D 5e SRD API (https://www.dnd5eapi.co)',
            license: 'Open Gaming License (OGL)',
            fetchedAt: new Date().toISOString(),
            count: allItems.length,
            items: allItems
        };

        const outputPath = path.join(__dirname, '..', 'src', 'data', 'srd-items.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        console.log(`Success! Saved ${allItems.length} items to ${outputPath}`);
        console.log(`  - Equipment: ${equipment.length}`);
        console.log(`  - Magic Items: ${magicItems.length}`);
        console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
