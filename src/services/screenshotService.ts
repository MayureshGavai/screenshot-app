export const captureScreen = async (): Promise<string> => {
  const sourceId = await window.electronAPI.getDesktopSourceId();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-expect-error Electron/Chromium-specific constraint
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
      },
    },
  });

  try {
    const video = document.createElement("video");
    ((video.muted = true), (video.srcObject = stream));

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not load screen video"));
    });

    await video.play();

    await new Promise<void>((resolve) => {
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => resolve());
      } else {
        requestAnimationFrame(() => resolve());
      }
    });

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (!canvas.width || !canvas.height) {
      throw new Error("Captured screen have invalid dimensions");
    }

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create the canvas context");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
};
