import { useNavigate } from "react-router";
import { routes } from "./routes";
import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Function to enhance routes with metadata based on their properties
const enhanceRoutes = (routes: typeof import("./routes").routes) => {
  // Predefined color gradients for variety
  const colorGradients = [
    "bg-gradient-to-br from-blue-500 to-purple-600",
    "bg-gradient-to-br from-emerald-500 to-teal-600",
    "bg-gradient-to-br from-orange-500 to-red-600",
    "bg-gradient-to-br from-indigo-500 to-blue-600",
    "bg-gradient-to-br from-pink-500 to-rose-600",
    "bg-gradient-to-br from-cyan-500 to-blue-600",
    "bg-gradient-to-br from-violet-500 to-purple-600",
    "bg-gradient-to-br from-green-500 to-emerald-600",
  ];

  return routes.map((route, index) => {
    // Generate title from path
    const title =
      route.path === "/"
        ? "Home"
        : route.path
            .slice(1)
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

    // Generate description from component name and path
    const componentName = route.element?.type?.name || "Component";
    const pathDescription =
      route.path === "/" ? "main application" : route.path.slice(1);
    const description = `${componentName} - ${pathDescription} interface and functionality`;

    // Assign random color from predefined gradients
    const color = colorGradients[index % colorGradients.length];

    return {
      ...route,
      title,
      description,
      color,
    };
  });
};

export default AllApps;

export function AllApps() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome to Tamagotchi
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choose an application to get started with your digital
            experience
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {enhanceRoutes(routes).map((route) => (
            <Card
              key={route.path}
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-0 shadow-lg overflow-hidden"
            >
              <div className={`${route.color} p-6 text-white`}>
                <CardTitle className="text-2xl font-bold text-white mb-2">
                  {route.title}
                </CardTitle>
                <CardDescription className="text-blue-100 text-base">
                  {route.description}
                </CardDescription>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Status
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Available
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Type</span>
                    <span className="text-sm font-medium text-slate-700">
                      {route.path === "/"
                        ? "Workspace"
                        : "Component Library"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Button
                  onClick={() => navigate(route.path)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white transition-colors duration-200"
                  size="lg"
                >
                  Launch {route.title}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-500">
            Built with React, TypeScript, and Shadcn UI
          </p>
        </div>
      </div>
    </div>
  );
}
