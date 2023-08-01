import "dotenv/config"

import { PrismaClient, User } from '@prisma/client'
import { loadAudioFromFile, transcribe } from '../audio.js'

import fs from 'fs';
import path from 'path'
import { tag } from '../questionaire.js'

const compareTags = (metadataTags: string[], generatedTags: string[]) => {
    const same: string[] = metadataTags.filter(tag => generatedTags.includes(tag));
    const added: string[] = generatedTags.filter(tag => !metadataTags.includes(tag));
    const removed: string[] = metadataTags.filter(tag => !generatedTags.includes(tag));

    return { same, added, removed };
}

const main = async () => {
    const directoryPath = "data/";

    // Read the JSON data from the metadata.json file and parse it
    const metadata = JSON.parse(fs.readFileSync(path.join(directoryPath, 'metadata.json'), 'utf-8'));

    const promises = metadata.map(async (entry) => {
        if (fs.existsSync(entry.filepath)) {
            const transcription = await transcribe(loadAudioFromFile(entry.filepath));
            const generatedTags = await tag(transcription);

            return { entry, generatedTags };
        } else {
            console.log(`No file found for metadata entry ${entry.filepath}`);
            return null;
        }
    });

    const results = await Promise.all(promises);
    const comparisonResults:{filepath:string, tagComparison:any}[] = [];

    for (const result of results) {
        if (result) {
            console.log(`Results for ${result.entry.filepath}`)
            console.log('Tags from metadata', result.entry.tags);
            console.log('Generated tags', result.generatedTags);

            const tagComparison = compareTags(result.entry.tags, result.generatedTags);
            comparisonResults.push({
                filepath: result.entry.filepath,
                tagComparison
            });
            console.log('Tag comparison:', tagComparison);
        }
    }
    
    // Write the comparison results into a json file
    const date = new Date();
    const timeSuffix = `${date.getHours()}-${date.getMinutes()}`;
    fs.writeFileSync(path.join(directoryPath, 'comparisons', `${timeSuffix}.json`), JSON.stringify(comparisonResults, null, 2));
}

main().catch(console.error);


