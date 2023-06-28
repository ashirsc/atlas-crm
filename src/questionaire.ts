import { HumanChatMessage, SystemChatMessage } from "langchain/schema";

import { ChatOpenAI } from "langchain/chat_models/openai";
import fs from 'fs';
import { jsonFormatGPT } from "./jsonchain";
import path from 'path';

const chat = new ChatOpenAI({ temperature: 0 });
export interface Question {
    text: string,
    type: string,
    example?: string,
    ans?: string
}

const qs: Question[] = [
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

export const fill = async (transcription: string): Promise<Question[]> => {

    const questions = qs.map(q => `${q.text} Type=${q.type} ${!!q.example ? "Example='" + q.example + "'" : ""}`).join("\n")

    const message = `Phone call:\n${transcription}\n\nQuestions:\n${questions}`

    const response = await chat.call([
        new SystemChatMessage(
            `You are a bot that answers questions about phone calls to a funeral home.
You MUST format you answer as a json array.
Each question should have a corresponding value in the array.
Wrap strings with double quotes.
Answer each question with json type specified after the question.
If the answer to the question is unknown or wasn't provided, answer null with no quotes.`
        ),
        new HumanChatMessage(message),
    ])


    //try once to json parse the response from chatGPT, if it fails retry with GPT3.
    let answerArray = []
    try {
        answerArray = JSON.parse(response.text)
    } catch (error) {
        console.log("failed on ", response.text)
        try {
            const rawJson = await jsonFormatGPT(response.text, "The json should be an array of values.")
            answerArray = JSON.parse(rawJson)
        } catch (error) {
            console.log("failed again", response.text)
            throw new Error("Received a invalid json response for questions.");

        }
    }

    return qs.map((item, index) => ({ ...item, ans: answerArray[index] }));



}



