export const captureScreen = async (sourceId: string): Promise<string> => {
  let stream: MediaStream | undefined;
  await window.electronAPI.hideWindow();

  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    // const sourceId = await window.electronAPI.getDesktopSourceId();

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-expect-error Electron/Chromium-specific constraint
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
        },
      },
    });
    const video = document.createElement("video");
    ((video.muted = true), (video.srcObject = stream));

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not load screen video"));
    });

    await video.play();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for a captured video frame."));
      }, 3000);

      const finish = () => {
        clearTimeout(timeout);
        resolve();
      };

      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => finish());
      } else {
        requestAnimationFrame(() => finish());
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
    stream?.getTracks().forEach((track) => track.stop());
    await window.electronAPI.showWindow();
  }
};
