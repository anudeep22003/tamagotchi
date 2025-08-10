import ShadcnSinglePageApp from "./pages/ShadcnSinglePageApp";
import HumanAiWorkspace from "./pages/HumanAiWorkspace";
import GrayscaleChartsShowcasePageElegant from "./pages/GrayscaleChartsShowcasePageElegant";
import ConversationalWorkspaceChatPage from "./pages/ConversationalWorkspaceChatPage";
import ConversationalTriVizPlaygroundPage from "./pages/ConversationalTriVizPlaygroundPage";
import ThreeJsCdnShowcaseWithFallbackPage from "./pages/ThreeJsCdnShowcaseWithFallbackPage";
import HelloWorldShadcnGrayscaleLanding from "./pages/HelloWorldShadcnGrayscaleLanding";

export const routes = [
  {
    path: "/",
    element: <HumanAiWorkspace />,
  },
  {
    path: "/shadcn",
    element: <ShadcnSinglePageApp />,
  },
  {
    path: "/grayscale-charts-showcase",
    element: <GrayscaleChartsShowcasePageElegant />,
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
  }
];
