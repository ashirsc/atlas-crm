import "dotenv/config"

import { PrismaClient, User } from '@prisma/client'
import { loadAudioFromFile, transcribe } from '../audio'

import fs from 'fs';
import path from 'path'
import { tag } from '../questionaire'

const compareTags = (metadataTags: string[], generatedTags: string[]) => {
    const same: string = metadataTags.filter(tag => generatedTags.includes(tag)).join();
    const added: string = generatedTags.filter(tag => !metadataTags.includes(tag)).join();
    const removed: string = metadataTags.filter(tag => !generatedTags.includes(tag)).join();

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

    for (const result of results) {
        if (result) {
            console.log(`Results for ${result.entry.filepath}`)
            console.log('Tags from metadata', result.entry.tags);
            console.log('Generated tags', result.generatedTags);

            const tagComparison = compareTags(result.entry.tags, result.generatedTags);
            console.log('Tag comparison:', tagComparison);
        }
    }
}



main()


