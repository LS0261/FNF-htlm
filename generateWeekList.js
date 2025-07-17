// generateWeekList.js
import { readdir, writeFile, readFile } from 'fs/promises';
import path from 'path';

const weeksDir = path.join('data', 'weeks');

async function generateWeekList() {
    try {
        const files = await readdir(weeksDir);
        const weekFiles = files.filter(f => f.endsWith('.json') && f !== 'weekList.json');

        const weeks = [];
        for (let file of weekFiles) {
            const content = await readFile(path.join(weeksDir, file), 'utf8');
            try {
                const json = JSON.parse(content);
                weeks.push({
                    file,
                    weekName: json.weekName || 'Unnamed Week',
                    songs: json.songs || []
                });
            } catch (err) {
                console.error(`❌ Error leyendo ${file}:`, err.message);
            }
        }

        await writeFile(path.join(weeksDir, 'weekList.json'), JSON.stringify({ weeks }, null, 2));
        console.log(`✅ weekList.json generado con ${weeks.length} weeks.`);
    } catch (err) {
        console.error('Error:', err);
    }
}

generateWeekList();