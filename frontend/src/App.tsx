import { useState } from "react";
import { Button } from "./components/ui/button";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={() => setCount(count + 1)}>
        Click to increment
      </Button>
      <p>Count: {count}</p>
    </div>
  );
}

export default App;
