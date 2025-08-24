import { useMemo } from "react";
import {
  useCodeMessages,
  useWriterMessages,
  useMessageStore,
} from "@/store/useMessageStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TabContent } from "./generative/TabContent";
import { TabControls } from "./generative/TabControls";
import { TabLabel } from "./generative/TabLabel";
import type { Actor } from "@/types/envelopeType";

const GenerativeHeader = () => {
  return (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <h2 className="text-lg font-medium">Generated Output</h2>
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      <GenerativeHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">
          No generated content yet. Use the Code or Write buttons to
          start.
        </p>
      </div>
    </div>
  );
};

export const GenerativeArea = () => {
  const codeMessages = useCodeMessages();
  const writerMessages = useWriterMessages();

  const activeTab = useMessageStore((state) => state.activeTab);
  const setActiveTab = useMessageStore((state) => state.setActiveTab);
  const streamingActors = useMessageStore(
    (state) => state.streamingActors
  );

  const availableTabs = useMemo(() => {
    const tabs: Actor[] = [];
    if (codeMessages.length > 0) tabs.push("coder");
    if (writerMessages.length > 0) tabs.push("writer");
    return tabs;
  }, [codeMessages.length, writerMessages.length]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as Actor, true);
  };

  // Use the first available tab as default
  const currentTab = activeTab || availableTabs[0] || "coder";

  if (availableTabs.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <GenerativeHeader />
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 pt-2">
          <TabsList className="w-fit">
            {availableTabs.map((actor) => (
              <TabsTrigger key={actor} value={actor}>
                <TabLabel
                  actor={actor}
                  isStreaming={streamingActors.has(actor)}
                />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {availableTabs.includes("coder" as Actor) && (
          <TabsContent value="coder" className="flex-1 mt-0">
            <TabContent messages={codeMessages} type="coder" />
          </TabsContent>
        )}

        {availableTabs.includes("writer" as Actor) && (
          <TabsContent value="writer" className="flex-1 mt-0">
            <TabContent messages={writerMessages} type="writer" />
          </TabsContent>
        )}
      </Tabs>

      <div className="p-4 border-t border-border">
        <TabControls />
      </div>
    </div>
  );
};
