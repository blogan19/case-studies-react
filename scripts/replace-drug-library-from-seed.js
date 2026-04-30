const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { Pool } = require('pg');

const seedPath = path.resolve(process.cwd(), 'server', 'seed', 'drug-library.seed.csv');
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/case_studies_react';

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"(.*)"$/, '$1'));
}

function parseDrugLibraryCsv(csvContent) {
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return {
      drugName: row.drug_name || '',
      strength: row.strength || '',
      unit: row.unit || '',
      form: row.form || '',
      defaultRoute: row.default_route || '',
      aliases: row.aliases || '',
      category: row.category || '',
      usualFrequencies: row.usual_frequencies || row.fequencies || '',
      defaultDose: row.default_dose || '',
      maximumDose: row.maximum_dose || row.max_dose || '',
      notes: row.notes || '',
    };
  }).filter((item) => String(item.drugName || '').trim());
}

function buildSortedUniqueLabels(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function scoreDrugLibraryItem(item) {
  return [
    item.defaultRoute,
    item.usualFrequencies,
    item.defaultDose,
    item.maximumDose,
    item.notes,
    item.unit,
    item.form,
    item.strength,
  ].reduce((total, value) => total + (String(value || '').trim() ? 1 : 0), 0);
}

function dedupeDrugLibraryItems(items) {
  const bestByKey = new Map();

  (items || []).forEach((item) => {
    const key = [
      String(item.drugName || '').trim().toLowerCase(),
      String(item.strength || '').trim().toLowerCase(),
      String(item.form || '').trim().toLowerCase(),
      String(item.defaultRoute || '').trim().toLowerCase(),
    ].join('||');
    const existing = bestByKey.get(key);

    if (!existing || scoreDrugLibraryItem(item) > scoreDrugLibraryItem(existing)) {
      bestByKey.set(key, item);
    }
  });

  return [...bestByKey.values()];
}

const frequencyAdminTimes = {
  'Each morning': '08:00',
  'Each night': '20:00',
  'Once weekly': '08:00',
  'Four times daily': '06:00,12:00,18:00,22:00',
  'Three times daily': '06:00,14:00,22:00',
  'Twice daily': '08:00,20:00',
  'Twelve hourly': '08:00,20:00',
  'Eight hourly': '06:00,14:00,22:00',
  'Six hourly': '00:00,06:00,12:00,18:00',
  'Four hourly': '00:00,04:00,08:00,12:00,16:00,20:00',
  'Three hourly': '00:00,03:00,06:00,09:00,12:00,15:00,18:00,21:00',
};

async function main() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }

  const csvContent = fs.readFileSync(seedPath, 'utf8');
  const items = dedupeDrugLibraryItems(parseDrugLibraryCsv(csvContent));
  const routes = buildSortedUniqueLabels(items.map((item) => item.defaultRoute));
  const frequencies = buildSortedUniqueLabels(items.map((item) => item.usualFrequencies));
  const units = buildSortedUniqueLabels(items.map((item) => item.unit));
  const forms = buildSortedUniqueLabels(items.map((item) => item.form));

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM drug_library_items');
    await client.query('DELETE FROM route_options');
    await client.query('DELETE FROM frequency_options');
    await client.query('DELETE FROM unit_options');
    await client.query('DELETE FROM form_options');

    for (const [index, label] of routes.entries()) {
      await client.query(
        'INSERT INTO route_options (id, label, sort_order) VALUES ($1, $2, $3)',
        [createId('route_option'), label, index]
      );
    }

    for (const [index, label] of frequencies.entries()) {
      await client.query(
        'INSERT INTO frequency_options (id, label, default_admin_times, sort_order) VALUES ($1, $2, $3, $4)',
        [createId('frequency_option'), label, frequencyAdminTimes[label] || '', index]
      );
    }

    for (const [index, label] of units.entries()) {
      await client.query(
        'INSERT INTO unit_options (id, label, sort_order) VALUES ($1, $2, $3)',
        [createId('unit_option'), label, index]
      );
    }

    for (const [index, label] of forms.entries()) {
      await client.query(
        'INSERT INTO form_options (id, label, sort_order) VALUES ($1, $2, $3)',
        [createId('form_option'), label, index]
      );
    }

    for (const item of items) {
      await client.query(
        `INSERT INTO drug_library_items (
           id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
           usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
           default_diluent, default_volume, maximum_dose, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10, '', FALSE, FALSE, FALSE, '', '', $11, $12)`,
        [
          createId('drug'),
          item.drugName,
          item.strength,
          item.unit,
          item.form,
          item.defaultRoute,
          item.aliases,
          item.category,
          item.usualFrequencies,
          item.defaultDose,
          item.maximumDose,
          item.notes,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Replaced live drug library with ${items.length} drugs, ${routes.length} routes, ${frequencies.length} frequencies, ${units.length} units, and ${forms.length} forms.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
