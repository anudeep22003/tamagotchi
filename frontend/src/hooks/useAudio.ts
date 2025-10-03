import { MediaManager } from "@/media";
import { useRef } from "react";

const useAudio = () => {
  const mediaManagerRef = useRef<MediaManager>(new MediaManager());

  return {
    mediaManager: mediaManagerRef.current,
    startRecording: () => mediaManagerRef.current.startRecording(),
    stopRecording: () => mediaManagerRef.current.stopRecording(),
  };
};

export default useAudio;
