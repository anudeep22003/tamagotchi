import { createBrowserRouter } from "react-router";
import { routes } from "./routes";
import { AllApps } from "./AllApps";

export const router = createBrowserRouter([
  {
    path: "/all-apps",
    element: <AllApps />,
  },
  ...routes,
]);
