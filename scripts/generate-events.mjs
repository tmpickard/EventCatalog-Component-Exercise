import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const eventsPath = path.join(projectRoot, 'public', 'events.json');

const locations = [
  ['Atlanta', 'GA'],
  ['Baltimore', 'MD'],
  ['Charlotte', 'NC'],
  ['Columbus', 'OH'],
  ['Dallas', 'TX'],
  ['Detroit', 'MI'],
  ['Honolulu', 'HI'],
  ['Las Vegas', 'NV'],
  ['Minneapolis', 'MN'],
  ['Nashville', 'TN'],
  ['Philadelphia', 'PA'],
  ['Phoenix', 'AZ'],
  ['Pittsburgh', 'PA'],
  ['Raleigh', 'NC'],
  ['Sacramento', 'CA'],
  ['Salt Lake City', 'UT'],
  ['San Diego', 'CA'],
  ['Tampa', 'FL'],
  ['Washington', 'DC'],
  ['Wichita', 'KS'],
];
const formats = ['League', 'Tournament', 'Casual'];
const capacities = [16, 20, 24, 32, 40, 48, 56, 64];
const eventData = JSON.parse(await readFile(eventsPath, 'utf8'));
const events = eventData.slice(0, 9);
const startDate = Date.UTC(2026, 9, 17);

for (let id = events.length + 1; id <= 500; id += 1) {
  const [city, state] = locations[(id - 10) % locations.length];
  const format = formats[(id - 10) % formats.length];
  const capacity = capacities[(id * 7) % capacities.length];
  const registered = (id * 13) % (capacity + 1);
  const date = new Date(startDate + ((id - 1) % 730) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  events.push({
    id,
    name: `${city} ${format} ${String(id).padStart(3, '0')}`,
    city,
    state,
    date,
    capacity,
    registered,
    format,
  });
}

await writeFile(eventsPath, `${JSON.stringify(events, null, 2)}\n`);
