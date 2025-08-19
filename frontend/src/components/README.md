# Three.js Visualization Component

A reusable React component that renders an interactive 3D particle visualization using Three.js. This component can be embedded anywhere in your website with customizable properties.

## Features

- **Interactive 3D Scene**: Wireframe sculpture with orbiting particles
- **Proximity Links**: Dynamic connections between nearby particles
- **Orbit Controls**: Drag to rotate, scroll to zoom
- **Mouse Interaction**: Subtle particle attraction to mouse movement
- **Responsive Design**: Adapts to container dimensions
- **Configurable**: Customize particle count, wireframe, links, and more
- **Performance Optimized**: Efficient rendering with proper cleanup

## Installation

Make sure you have Three.js installed:

```bash
npm install three
npm install @types/three  # for TypeScript
```

## Basic Usage

```tsx
import ThreeJsVisualization from './components/ThreeJsVisualization';

function MyPage() {
  return (
    <div>
      <h1>My Website</h1>
      <ThreeJsVisualization 
        height="400px" 
        width="100%" 
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `""` | Additional CSS classes |
| `style` | `React.CSSProperties` | `{}` | Additional inline styles |
| `particleCount` | `number` | `800` | Number of particles to render |
| `wireframe` | `boolean` | `true` | Enable/disable wireframe mode |
| `linksEnabled` | `boolean` | `true` | Show/hide proximity links |
| `autoPlay` | `boolean` | `true` | Start animation automatically |
| `showControls` | `boolean` | `true` | Show control buttons overlay |
| `height` | `string \| number` | `"400px"` | Component height |
| `width` | `string \| number` | `"100%"` | Component width |

## Usage Examples

### 1. Hero Section Background

```tsx
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
    <h1 className="text-6xl font-bold">Welcome to My Site</h1>
  </div>
</section>
```

### 2. Sidebar Widget

```tsx
<aside className="w-80 bg-zinc-900 p-4">
  <h3 className="text-white text-lg mb-4">Live Visualization</h3>
  <ThreeJsVisualization
    height="300px"
    width="100%"
    particleCount={400}
    showControls={true}
    autoPlay={true}
  />
</aside>
```

### 3. Embedded in Content

```tsx
<article className="max-w-4xl mx-auto p-6">
  <h1>My Article</h1>
  <p>Here's some content...</p>
  
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
  
  <p>More content...</p>
</article>
```

### 4. Floating Overlay

```tsx
<div className="relative min-h-screen">
  {/* Main content */}
  <div className="p-8">
    <h1>My Website</h1>
    <p>Content goes here...</p>
  </div>
  
  {/* Floating visualization in corner */}
  <div className="fixed bottom-8 right-8 z-50">
    <ThreeJsVisualization
      height="200px"
      width="200px"
      particleCount={300}
      showControls={false}
      autoPlay={true}
      className="rounded-full shadow-2xl"
    />
  </div>
</div>
```

### 5. Responsive Grid Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  <div className="bg-zinc-800 rounded-lg p-4">
    <h3>Particle System A</h3>
    <ThreeJsVisualization
      height="200px"
      width="100%"
      particleCount={400}
      showControls={false}
      autoPlay={true}
    />
  </div>
  
  <div className="bg-zinc-800 rounded-lg p-4">
    <h3>Particle System B</h3>
    <ThreeJsVisualization
      height="200px"
      width="100%"
      particleCount={600}
      wireframe={false}
      showControls={false}
      autoPlay={true}
    />
  </div>
</div>
```

## Alternative Approaches

### Option 1: Convert to Reusable Component (Recommended)
- ✅ **Pros**: Full interactivity, customizable, reusable
- ✅ **Cons**: Requires Three.js dependency
- **Best for**: Interactive experiences, hero sections, embedded content

### Option 2: Extract as SVG Animation
- ❌ **Not Recommended**: Three.js scenes are too complex for SVG
- **Why**: SVG is 2D, your visualization is 3D with WebGL rendering

### Option 3: Convert to Video/GIF
- ❌ **Not Recommended**: Loses interactivity, large file sizes
- **Why**: Static media can't replicate the dynamic, interactive experience

### Option 4: Use as Background with CSS Positioning
- ✅ **Pros**: Easy to implement, good for hero sections
- ✅ **Cons**: Limited to full-screen or large containers
- **Best for**: Hero backgrounds, full-page experiences

## Performance Considerations

- **Particle Count**: Lower counts (400-800) for better performance
- **Mobile**: Consider reducing particle count on smaller devices
- **Multiple Instances**: Each instance creates its own WebGL context
- **Cleanup**: Component automatically cleans up resources on unmount

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (WebGL support required)
- **Mobile**: iOS Safari, Chrome Mobile (with reduced particle count)
- **Fallback**: Shows helpful error message if Three.js isn't installed

## Troubleshooting

### Three.js Not Found
```bash
npm install three
```

### Performance Issues
- Reduce `particleCount`
- Disable `linksEnabled` for complex scenes
- Use `showControls={false}` to hide overlay elements

### Memory Leaks
- Component automatically cleans up on unmount
- Ensure proper React key props when using multiple instances

## Customization

The component is designed to be flexible. You can:

- Override styles with `className` and `style` props
- Adjust dimensions with `height` and `width`
- Control behavior with boolean flags
- Modify the source code for advanced customization

## License

This component is part of your project. Feel free to modify and use as needed.


