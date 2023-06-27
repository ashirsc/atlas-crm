import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
} from "langchain/prompts";

import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";

export async function jsonFormatGPT(badJson: string, additionalInstuctrions: string = ""): Promise<string> {
    // const chat = new ChatOpenAI({ temperature: 0 });
    // const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    //     SystemMessagePromptTemplate.fromTemplate(
    //         "You are a helpful assistant that formats data as JSON." + additionalInstuctrions 
    //     ),
    //     HumanMessagePromptTemplate.fromTemplate("{json}"),
    // ]);
    // const chain = new LLMChain({
    //     prompt: chatPrompt,
    //     llm: chat,
    // });


    const model = new OpenAI({ temperature: 0.1 });
    const template = `Format this as json.\n${additionalInstuctrions}\ninput: {badJson}\nouput:`;
    const prompt = new PromptTemplate({
        template: template,
        inputVariables: ["badJson"],
    });
    const chain = new LLMChain({ llm: model, prompt: prompt });



    const res = await chain.call({
        badJson
    });
    return res.text

}