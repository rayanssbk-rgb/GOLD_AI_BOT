import { writeFileSync } from 'fs';
import { STRIKES, B, CRYSTALS } from '../src/timeline.js';
writeFileSync(new URL('./events.json', import.meta.url), JSON.stringify({ STRIKES, B, CRYSTALS: CRYSTALS.map((c) => c.t) }));
console.log('strikes', STRIKES.length);
