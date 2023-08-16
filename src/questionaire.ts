import { HumanChatMessage, SystemChatMessage } from "langchain/schema";

import { ChatOpenAI, } from "langchain/chat_models/openai";
import fs from 'fs';
import { jsonFormatGPT } from "./jsonchain.js";
import path from 'path';

// const chat = new ChatOpenAI({ temperature: 0, modelName: "gpt-3.5-turbo" });
const chat = new ChatOpenAI({ temperature: 0, modelName: "gpt-4" });
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

enum CustomerLabels {
    qualified = "Qualified lead",
    unqualified = "Unqualified",
    atNeed = "At need",
    preNeed = "Pre need",
    imminentNeed = "Imminent need",
    earnestShopper = "Earnest shopper",
    priceShopper = "Price shopper"
}

export async function tag(transcription: string) {

    async function shopperType(): Promise<CustomerLabels> {
        const typeResponse = await chat.call([
            new SystemChatMessage(`You are a bot that answers questions about phone calls to a funeral home.
If someone has passed away, they are "${CustomerLabels.atNeed}".
If someone is expected to pass soon(within the next couple of days or months), they are "${CustomerLabels.imminentNeed}".
If no one is passing soon but the caller is making advanced arrangements, they are "${CustomerLabels.preNeed}"
Answer with '${CustomerLabels.atNeed}', '${CustomerLabels.imminentNeed}', or '${CustomerLabels.preNeed}' and nothing else.`),
            new HumanChatMessage(transcription)
        ])

        // console.log('typeResponse.text', typeResponse.text)
        return typeResponse.text as CustomerLabels
    }

    let tags: CustomerLabels[] = []

    const qualifiedResponse = await chat.call([
        new SystemChatMessage(`You are a bot that answers questions about phone calls to a funeral home.
if the caller is calling with the motivation to learn more about a funeral home's services because they are needing or wanting to make funeral service arrangements - they are qualified.
They are not qualified if they are calling to ask questions such as: What time is the service for Susan Smith? Or my aunt's body was taken to a funeral home yesterday, is she at your funeral home? Questions such as these are not qualified.

Answer with '${CustomerLabels.qualified}' or '${CustomerLabels.unqualified}' and nothing else.`),
        new HumanChatMessage(transcription)
    ])

    // console.log('qualifiedResponse.text', qualifiedResponse.text)
    if (qualifiedResponse.text as CustomerLabels == CustomerLabels.qualified) {
        tags.push(CustomerLabels.qualified)

        const timelineResponse = await chat.call([
            new SystemChatMessage(`You are a bot that answers questions about phone calls to a funeral home.
If someone has passed away, they are "${CustomerLabels.atNeed}".
If someone is expected to pass soon(within the next couple of days or months), they are "${CustomerLabels.imminentNeed}".
If no one is passing soon but the caller is making advanced arrangements, they are "${CustomerLabels.preNeed}"
Answer with '${CustomerLabels.atNeed}', '${CustomerLabels.imminentNeed}', or '${CustomerLabels.preNeed}' and nothing else.`),
            new HumanChatMessage(transcription)
        ])

        let type: CustomerLabels;
        // console.log('timelineResponse.text', timelineResponse.text)
        switch (timelineResponse.text) {
            case CustomerLabels.atNeed:
                tags.push(CustomerLabels.atNeed)
                type = await shopperType()
                tags.push(type)
                break;
            case CustomerLabels.imminentNeed:
                tags.push(CustomerLabels.imminentNeed)
                type = await shopperType()
                tags.push(type)

                break;
            case CustomerLabels.preNeed:
                tags.push(CustomerLabels.preNeed)

                break;

            default:
                console.error("Bad timeline tag: ", timelineResponse.text)
                break;
        }
    } else {
        tags.push(CustomerLabels.unqualified)
    }


    return tags

}



