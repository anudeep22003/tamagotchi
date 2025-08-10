import HumanAiWorkspace from "./pages/HumanAiWorkspace";
import ConversationalWorkspaceChatPage from "./pages/ConversationalWorkspaceChatPage";
import ConversationalTriVizPlaygroundPage from "./pages/ConversationalTriVizPlaygroundPage";
import ThreeJsCdnShowcaseWithFallbackPage from "./pages/ThreeJsCdnShowcaseWithFallbackPage";
import HelloWorldShadcnGrayscaleLanding from "./pages/HelloWorldShadcnGrayscaleLanding";
import TwitterDataChatPageWithSocketKnowledgeStream from "./pages/TwitterDataChatPageWithSocketKnowledgeStream";
import TwitterKnowledgeChatPage from "./pages/TwitterKnowledgeChatPage";

export const routes = [
  {
    path: "/",
    element: <HumanAiWorkspace />,
  },
  {
    path: "/conversational-workspace-chat",
    element: <ConversationalWorkspaceChatPage />,
  },
  {
    path: "/conversational-tri-viz-playground",
    element: <ConversationalTriVizPlaygroundPage />,
  },
  {
    path: "/threejs-cdn-showcase",
    element: <ThreeJsCdnShowcaseWithFallbackPage />,
  },
  {
    path: "/hello-world-shadcn-grayscale-landing",
    element: <HelloWorldShadcnGrayscaleLanding />,
  },
  {
    path: "/twitter-data-chat",
    element: <TwitterDataChatPageWithSocketKnowledgeStream />,
  },
  {
    path: "/twitter-knowledge-chat",
    element: <TwitterKnowledgeChatPage />,
  }
];
