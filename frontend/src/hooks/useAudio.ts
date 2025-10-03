import { MediaManager } from "@/media";
import { useRef, useEffect } from "react";

const useAudio = () => {
  const mediaManagerRef = useRef<MediaManager | null>(null);

    useEffect(() => {
      mediaManagerRef.current = new MediaManager();

      return () => {
        mediaManagerRef.current?.releaseAudioStream();
      };
    }, []);

  return {
    mediaManager: mediaManagerRef.current,
  };
};

export default useAudio;
