//importing Open AI Lib And Core Functions
const OpenAI = require("openai");

const configuration = {
    apiKey: "REPLACE WITH SECRET KEY"
};

const openai = new OpenAI(configuration);

// Defining a conversation message with roles and content
let message = [
  {
    role: "system",
    content: "You Are A Banker, Be A very Rude One",
  },
  {
    role: "user",
    content: "do i have money in my account, can i applly for a loan",
  },
];

async function getChatResponse() {
  try {
    // Making an asynchronous call to create a chat completion
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k-0613",
      messages: message,
      temperature: 1,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // Logging the response from OpenAI to the console
    console.log(response.choices[0].message.content.toString());
  } catch (error) {
    // Handling errors if any occur during the API call
    console.error("Error occurred:", error);
  }
}

// Calling the function to get the chat response
getChatResponse();
