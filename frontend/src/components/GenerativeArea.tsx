import {
  useMessageStore,
  useAvailableActors,
  type BaseMessage,
} from "@/store/useMessageStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TabControls } from "./generative/TabControls";
import { TabLabel } from "./generative/TabLabel";
import type { Actor } from "@/types/envelopeType";
import { actorRegistry } from "./generative/Registry";

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
  const allMessages = useMessageStore((state) => state.allMessages);

  const activeTab = useMessageStore((state) => state.activeTab);
  const setActiveTab = useMessageStore((state) => state.setActiveTab);
  const streamingActors = useMessageStore(
    (state) => state.streamingActors
  );
  const availableTabs = Array.from(useAvailableActors());

  const handleTabChange = (value: string) => {
    setActiveTab(value as Actor, true);
  };

  const currentTab = activeTab || availableTabs[0] || "coder";

  if (availableTabs.length === 0) {
    return <EmptyState />;
  }

  const renderTabContent = (
    actor: Actor,
    allMessages: BaseMessage[]
  ) => {
    if (actor === "assistant") {
      return null;
    }
    const Component = actorRegistry[actor].component;
    const messages = actorRegistry[actor].messageSelector(allMessages);
    return messages.map((message) => (
      <Component key={message.id} message={message} />
    ));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <GenerativeHeader />
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-y-auto"
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
        {availableTabs.map((actor) => (
          <TabsContent
            key={actor}
            value={actor}
            className="flex-1 mt-0"
          >
            {renderTabContent(actor, allMessages)}
          </TabsContent>
        ))}
      </Tabs>

      <div className="p-4 border-t border-border">
        <TabControls />
      </div>
    </div>
  );
};
