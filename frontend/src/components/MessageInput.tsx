import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";

export const MessageInput = () => {
  const { inputText, setInputText, handleInputSendClick } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [inputText]);

  return (
    <div className="flex gap-2 mb-2">
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            handleInputSendClick();
          }
        }}
        placeholder="Type your message..."
        className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[40px]"
        rows={1}
      />
      <Button onClick={handleInputSendClick} size="sm">
        Send
      </Button>
    </div>
  );
};