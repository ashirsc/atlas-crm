import { Configuration, OpenAIApi } from "openai";
import { access, readFile, writeFile, } from 'fs/promises'

import { createReadStream } from "fs";
import path from "path";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);


export const transcribe = async (audio: File) => {

    try {
        const maxBodyLength = 25 * 1024 * 1024 // 25MBs
        const resp = await openai.createTranscription(audio, "whisper-1", undefined, undefined, undefined, undefined, { maxBodyLength });
        return resp.data.text

    } catch (e) {
        console.log((e as any).toJSON())
        throw new Error("Failed transcription api call.");

    }
}




export const loadAudioFromFile = async (filename: string): Promise<File | undefined> => {
    try {
        const fileAccess = await access(filename).then(() => true).catch(() => false)
        if (!fileAccess) {
            return
        }

        return createReadStream(path.join(filename)) as unknown as File
    } catch (error) {
        console.log(error)
        return

    }

}

