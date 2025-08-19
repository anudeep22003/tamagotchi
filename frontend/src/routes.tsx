import HumanAiWorkspace from "./pages/HumanAiWorkspace";
import ConversationalWorkspaceChatPage from "./pages/ConversationalWorkspaceChatPage";
import ConversationalTriVizPlaygroundPage from "./pages/ConversationalTriVizPlaygroundPage";
import ThreeJsCdnShowcaseWithFallbackPage from "./pages/ThreeJsCdnShowcaseWithFallbackPage";
import HelloWorldShadcnGrayscaleLanding from "./pages/HelloWorldShadcnGrayscaleLanding";
import TwitterDataChatPageWithSocketKnowledgeStream from "./pages/TwitterDataChatPageWithSocketKnowledgeStream";
import TwitterKnowledgeChatPage from "./pages/TwitterKnowledgeChatPage";
import TwitterInsightsSummarizerPage from "./pages/TwitterInsightsSummarizerPage";
import GrayscaleThreeShowcaseExperiencePage from "./pages/GrayscaleThreeShowcaseExperiencePage";
import TwitterKnowledgebaseChatExperience from "./pages/TwitterKnowledgebaseChatExperience";
import BrainElectricVisualizationShowcase from "./pages/BrainElectricVisualizationShowcase";
import NeuralFluxThreeBrainVisualizationPage from "./pages/NeuralFluxThreeBrainVisualizationPage";
import CalorieVisionTrackerPersonalizedPage from "./pages/CalorieVisionTrackerPersonalizedPage";
import SnakeIoPlaygroundPage from "./pages/SnakeIoPlaygroundPage";
import SnakeGameInteractivePage from "./pages/SnakeGameInteractivePage";
import GymWorkoutAndRecoveryPlannerPage from "./pages/GymWorkoutAndRecoveryPlannerPage";
import MinimalGrayscaleHelloWorldPage from "./pages/MinimalGrayscaleHelloWorldPage";

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
  },
  {
    path: "/twitter-insights-summarizer",
    element: <TwitterInsightsSummarizerPage />,
  },
  {
    path: "/grayscale-three-showcase",
    element: <GrayscaleThreeShowcaseExperiencePage />,
  },
  {
    path: "/twitter-knowledgebase-chat",
    element: <TwitterKnowledgebaseChatExperience />,
  },
  {
    path: "/brain-electric-visualization-showcase",
    element: <BrainElectricVisualizationShowcase />,
  },
  {
    path: "/neural-flux",
    element: <NeuralFluxThreeBrainVisualizationPage />,
  },
  {
    path: "/calorie-vision",
    element: <CalorieVisionTrackerPersonalizedPage />,
  },
  {
    path: "/snake-io",
    element: <SnakeIoPlaygroundPage />,
  },
  {
    path: "/snake",
    element: <SnakeGameInteractivePage />,
  },
  {
    path: "/gym-workout-and-recovery-planner",
    element: <GymWorkoutAndRecoveryPlannerPage />,
  },
  {
    path: "/twitter-knowledge-chat",
    element: <TwitterKnowledgeChatPage />,
  },
  {
    path: "/minimal-grayscale-hello-world",
    element: <MinimalGrayscaleHelloWorldPage />,
  }
];
