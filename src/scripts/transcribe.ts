import "dotenv/config"

import { loadAudioFromFile, transcribe } from "../audio.js";

if (process.argv.length < 3) {
    console.error('Please provide the path to the audio file');
    process.exit(1);
}

const audioFilePath = process.argv[2];


const transcription = await transcribe(await loadAudioFromFile(audioFilePath) as File)

console.log(transcription);

