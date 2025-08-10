import ShadcnSinglePageApp from "./pages/ShadcnSinglePageApp";
import { HumanAiWorkspace } from "./pages/HumanAiWorkspace";

export const routes = [
  {
    path: "/",
    element: <HumanAiWorkspace />,
  },
  {
    path: "/shadcn",
    element: <ShadcnSinglePageApp />,
  },
];
