import { memo } from "react";
import { MarkdownRenderer } from "../MarkdownRenderer";
import type { BaseMessage } from "@/store/useMessageStore";

export const WriterMessage = memo(({ message }: { message: BaseMessage }) => {
  return (
    <div className="bg-secondary/10 rounded-lg border border-border p-4">
      <MarkdownRenderer content={message.content} className="text-sm" />
    </div>
  );
});

WriterMessage.displayName = "WriterMessage";