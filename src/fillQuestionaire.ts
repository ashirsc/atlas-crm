import "dotenv/config"

import { AIChatMessage, HumanChatMessage, SystemChatMessage } from "langchain/schema";

import { ChatOpenAI } from "langchain/chat_models/openai";
import fs from 'fs';
import { jsonFormatGPT } from "./jsonchain";
import path from 'path';

const chat = new ChatOpenAI({ temperature: 0 });

const main = async () => {

    const directoryPath = "docs/scott/transcripts";

    const files = fs.readdirSync(directoryPath).filter((file) => path.extname(file) === '.json' && !file.includes(".responses"))

    const fileData = files.map((file) => {
        const filePath = path.join(directoryPath, file);
        const fileData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileData);
    });

    const instructions = ``

    const qs = [
        {
            text: "What is the purpose of the call? Provide deatil.",
            type: "string",
        },
        {
            text: "Was the caller interested in the funeral home's services?",
            type: "bool",
        },
        {
            text: "What is the name of the deceased person?",
            type: "string",
        },
        {
            text: "What is the name of the person who called?",
            type: "string",
        },
        {
            text: "What is the caller's relationship to the deceased?",
            type: "string",
            example: "Daughter of the deceased"
        },
        {
            text: "What is the phone number of the caller?",
            type: "string",
        },
        {
            text: "What is the email of the caller?",
            type: "string",
        }
    ]

    const questions = qs.map(q => `${q.text} Type=${q.type} ${!!q.example ? "Example='" + q.example + "'" : ""}`).join("\n")


    let promises = []
    fileData.forEach((d) => {

        const message = `Phone call:\n${d.text}\n\nQuestions:\n${questions}`
        console.log(message)
        promises.push(
            chat.call([
                new SystemChatMessage(
                    `You are a bot that answers questions about phone calls to a funeral home.
You MUST format you answer as a json array.
Each question should have a corresponding value in the array.
Wrap strings with double quotes.
Answer each question with json type specified after the question.
If the answer to the question is unknown or wasn't provided, answer null with no quotes.`
                    // Here is a sample answer: [false,"The caller was not looking for funeral or cremation services.","The caller was calling to inquire about using a cremation service to help the deceased get rid of her life insurance policies in order to qualify for Medicaid for assisted living.","Bernadette McAllister","Barbara Pavis","The caller did not specify their relationship to the deceased.","650-281-8146",null]`
                ),
                new HumanChatMessage(message),
            ])
        )

    })

    const data: AIChatMessage[] = await Promise.all(promises)

    // console.log(data)
    let fails = 0
    const responses = await Promise.all(data.map(async d => {
        try {

            const json = JSON.parse(d.text)
            return json
        } catch (error) {
            console.log("failed on ", d.text)
            try {
                const json = await jsonFormatGPT(d.text, "The json should be an array of values.")
                return JSON.parse(json)
            } catch (error) {

                console.log("failed again", d.text)
                fails++
                return []
            }
        }
    }))


    const outDirPath = "docs/scott/answers";


    files
        .forEach((file, index) => {


            const newFileName = path.basename(file, '.json') + '.responses.json';
            const newFilePath = path.join(outDirPath, newFileName);

            const data = {
                transcript: fileData[index].text,
                qualification:  qs.map((q,j) => ({question:q.text,answer:responses[index][j]}))
            }

            fs.writeFileSync(newFilePath, JSON.stringify(data, null, 2));
        });

}



main()