// Dump timing (gait contacts, bolts, beats, voice) for the sound script.
import { writeFileSync } from 'fs';
import { GAITS, BOLTS, B, VO, DUR, gaitEvents } from '../src/timeline.js';
const steps = Object.fromEntries(Object.entries(GAITS).map(([k, g]) => [k, gaitEvents(g)]));
writeFileSync(new URL('./events.json', import.meta.url), JSON.stringify({ DUR, B, VO, BOLTS, steps }, null, 1));
console.log(Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, v.length])));
