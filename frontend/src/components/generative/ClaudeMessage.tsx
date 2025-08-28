import { memo } from "react";
import type { BaseMessage } from "@/store/useMessageStore";

export const ClaudeMessage = memo(
  ({ message }: { message: BaseMessage }) => {
    return (
      <div className="bg-black rounded-lg border border-gray-700 overflow-hidden shadow-lg">
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-gray-400 text-sm font-medium ml-2">
            Terminal Output
          </div>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-sm text-green-400 bg-black">
          <pre className="whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </pre>
        </div>
      </div>
    );
  }
);

ClaudeMessage.displayName = "ClaudeMessage";
