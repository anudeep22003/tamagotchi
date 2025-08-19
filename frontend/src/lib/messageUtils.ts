import type {
  StreamingResponse,
  SimpleResponse,
} from "@/types/serverTypes";

export interface Message {
  id: string;
  contentType: "human" | "generative" | "assistant";
  content: string;
  timestamp: Date;
}

export const createHumanMessage = (content: string): Message => ({
  id: `human-${Date.now()}`,
  contentType: "human",
  content,
  timestamp: new Date(),
});

export const updateMessagesWithStreamData = (
  messages: Message[],
  data: StreamingResponse | SimpleResponse
): Message[] => {
  if ("choices" in data) {
    // StreamingResponse
    const choice = data.choices[0];
    if (!choice?.delta?.content) return messages;

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage?.contentType === "generative" &&
      lastMessage.id === data.id
    ) {
      // Update existing message
      return messages.map((msg) =>
        msg.id === data.id
          ? { ...msg, content: msg.content + choice.delta.content }
          : msg
      );
    } else {
      // Create new message
      const newMessage: Message = {
        id: data.id,
        contentType: "generative",
        content: choice.delta.content,
        timestamp: new Date(data.created * 1000),
      };
      return [...messages, newMessage];
    }
  } else {
    // SimpleResponse
    const newMessage: Message = {
      id: data.id,
      contentType: "generative",
      content: data.content,
      timestamp: new Date(data.timestamp),
    };
    return [...messages, newMessage];
  }
};

export const returnUrlIfExists = (text: string): string | null => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

export const prepareCodeMessage = async (
  text: string
): Promise<object> => {
  try {
    // Read files from the public folder
    const [packageResponse, contextResponse, componentsResponse] =
      await Promise.all([
        fetch("/package.json"),
        fetch("/AppContext.tsx"),
        fetch("/ui-components.txt"),
      ]);

    const packages = await packageResponse.text();
    const context = await contextResponse.text();
    const componentsList = await componentsResponse.text();

    // Convert to comma-separated list for backend
    const components = componentsList
      .split("\n")
      .filter(Boolean)
      .join(", ");

    return {
      query: text,
      context: context,
      packages: packages,
      components: components,
    };
  } catch (error) {
    console.error("Error reading files:", error);
    throw new Error(`Failed to prepare code message: ${error}`);
  }
};
