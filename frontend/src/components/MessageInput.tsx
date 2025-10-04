import { useAppContext } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useCallback, useState } from "react";
import { MicIcon } from "lucide-react";

export const MessageInput = () => {
  const {
    inputText,
    setInputText,
    handleInputSendClick,
    mediaManager,
  } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      const transcribedText = await mediaManager?.stopRecording();
      if (transcribedText) {
        setInputText((prevText) => prevText + "\n\n" + transcribedText);
      }
      setIsRecording(false);
    } else {
      await mediaManager?.startRecording();
      setIsRecording(true);
    }
  }, [mediaManager, isRecording, setInputText]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newInputText = e.target.value;
      setInputText(newInputText);
    },
    [setInputText]
  );

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

  const isSubmitEnabled = inputText.trim() !== "";

  const handleSubmit = useCallback(() => {
    if (isSubmitEnabled) {
      handleInputSendClick();
    }
  }, [isSubmitEnabled, handleInputSendClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && isSubmitEnabled) {
        handleSubmit();
      }
    },
    [handleSubmit, isSubmitEnabled]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none overflow-hidden min-h-[40px]"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!isSubmitEnabled}
          size="sm"
        >
          Send
        </Button>
        <Button
          onClick={handleRecordClick}
          size="sm"
          className={isRecording ? "bg-red-500 hover:bg-red-600" : ""}
        >
          <MicIcon className="w-4 h-4" />{" "}
          {isRecording ? "Stop" : "Record"}
        </Button>
      </div>
    </div>
  );
};
