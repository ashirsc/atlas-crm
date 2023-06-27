import  "dotenv/config";

import { createReadStream, readdirSync, } from "fs";

import path from "path";
import {writeFile} from 'fs/promises'

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const basePath = "docs/scott/audio/";

const main = async () => {
    const files = readdirSync(basePath);
    const wavFiles = files.filter((file) => path.extname(file) === '.wav');
    
    const promises = wavFiles.map((file) => {
        return new Promise<void>(async (resolve, reject) => {
            try {
                const resp = await openai.createTranscription(
                    createReadStream(path.join(basePath, file)),
                    "whisper-1"
                );

                const filename = path.join(basePath, path.basename(file, path.extname(file)) + ".json");
                await writeFile(filename, JSON.stringify(resp.data));

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

    try {
        await Promise.all(promises);
    } catch (e) {
        console.log((e as any).response.data);
    }
}

main();