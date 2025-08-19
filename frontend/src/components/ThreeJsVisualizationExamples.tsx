import React from "react";
import ThreeJsVisualization from "./ThreeJsVisualization";

/**
 * Examples of how to use the ThreeJsVisualization component in different contexts
 */

// Example 1: Hero Section Background
export const HeroSectionExample: React.FC = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background visualization */}
      <div className="absolute inset-0 z-0">
        <ThreeJsVisualization
          height="100vh"
          width="100vw"
          particleCount={1200}
          showControls={false}
          autoPlay={true}
          className="opacity-40"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex items-center justify-center h-full text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">
            Welcome to My Site
          </h1>
          <p className="text-xl text-zinc-300">
            Interactive 3D visualization in the background
          </p>
        </div>
      </div>
    </section>
  );
};

// Example 2: Sidebar Widget
export const SidebarWidgetExample: React.FC = () => {
  return (
    <aside className="w-80 bg-zinc-900 p-4">
      <h3 className="text-white text-lg mb-4">Live Visualization</h3>
      <ThreeJsVisualization
        height="300px"
        width="100%"
        particleCount={400}
        showControls={true}
        autoPlay={true}
        className="rounded-lg"
      />
      <p className="text-zinc-400 text-sm mt-2">
        Interactive 3D particle system with orbit controls
      </p>
    </aside>
  );
};

// Example 3: Embedded in Content
export const ContentEmbedExample: React.FC = () => {
  return (
    <article className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Article</h1>

      <p className="mb-6">
        Here's some content about my project. Below is an interactive
        visualization that demonstrates the concepts I'm discussing.
      </p>

      {/* Embedded visualization */}
      <div className="my-8">
        <ThreeJsVisualization
          height="400px"
          width="100%"
          particleCount={600}
          showControls={true}
          autoPlay={true}
          className="rounded-lg shadow-lg"
        />
      </div>

      <p className="mb-6">
        The visualization above shows particles interacting in 3D space.
        You can drag to rotate the view and see the dynamic connections.
      </p>
    </article>
  );
};

// Example 4: Floating Overlay
export const FloatingOverlayExample: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      {/* Main content */}
      <div className="p-8 text-white">
        <h1 className="text-4xl font-bold mb-4">My Website</h1>
        <p className="text-xl">Content goes here...</p>
      </div>

      {/* Floating visualization in corner */}
      <div className="fixed bottom-8 right-8 z-50">
        <ThreeJsVisualization
          height="200px"
          width="200px"
          particleCount={300}
          showControls={false}
          autoPlay={true}
          className="rounded-full shadow-2xl border-2 border-white/20"
        />
      </div>
    </div>
  );
};

// Example 5: Responsive Grid Layout
export const GridLayoutExample: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {/* Card 1 */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-white text-lg mb-3">Particle System A</h3>
        <ThreeJsVisualization
          height="200px"
          width="100%"
          particleCount={400}
          showControls={false}
          autoPlay={true}
        />
      </div>

      {/* Card 2 */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-white text-lg mb-3">Particle System B</h3>
        <ThreeJsVisualization
          height="200px"
          width="100%"
          particleCount={600}
          wireframe={false}
          showControls={false}
          autoPlay={true}
        />
      </div>

      {/* Card 3 */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-white text-lg mb-3">Particle System C</h3>
        <ThreeJsVisualization
          height="200px"
          width="100%"
          particleCount={800}
          linksEnabled={false}
          showControls={false}
          autoPlay={true}
        />
      </div>
    </div>
  );
};

// Example 6: Conditional Rendering
export const ConditionalRenderingExample: React.FC = () => {
  const [showVisualization, setShowVisualization] =
    React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleToggle = () => {
    if (!showVisualization) {
      setIsLoading(true);
      // Simulate loading delay
      setTimeout(() => {
        setIsLoading(false);
        setShowVisualization(true);
      }, 1000);
    } else {
      setShowVisualization(false);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={handleToggle}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
      >
        {showVisualization ? "Hide" : "Show"} Visualization
      </button>

      {isLoading && (
        <div className="h-64 bg-zinc-800 rounded-lg flex items-center justify-center">
          <div className="text-white">Loading 3D scene...</div>
        </div>
      )}

      {showVisualization && !isLoading && (
        <ThreeJsVisualization
          height="400px"
          width="100%"
          particleCount={500}
          showControls={true}
          autoPlay={true}
          className="rounded-lg"
        />
      )}
    </div>
  );
};


