import { useAppContext } from "@/context/AppContext";
import { useCodeMessages, useMessageStore } from "@/store/useMessageStore";
import { Button } from "../ui/button";
import type { GeneratedCode } from "@/types/serverTypes";

export const TabControls = () => {
  const { emit } = useAppContext();
  const codeMessages = useCodeMessages();
  const activeTab = useMessageStore((state) => state.activeTab);

  const hasCode = codeMessages.length > 0;
  const lastCodeMessage = hasCode
    ? codeMessages[codeMessages.length - 1]
    : null;

  const handleInstallApp = () => {
    if (!lastCodeMessage) return;

    const payload: GeneratedCode = {
      code: lastCodeMessage.content,
    };

    emit("write_tsx_and_add_route", payload);
  };

  if (activeTab === "coder") {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Use the latest output to create a new route.
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={handleInstallApp}
          disabled={!hasCode}
        >
          Install App
        </Button>
      </div>
    );
  }

  if (activeTab === "writer") {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Writer output ready for review.
        </p>
      </div>
    );
  }

  return null;
};