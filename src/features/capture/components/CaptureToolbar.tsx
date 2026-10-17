import { Aperture, Check, ChevronDown, Crop, Monitor, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

type CaptureMode = "rectangle" | "screen";

type Selection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const MIN_SELECTION_SIZE = 3;

const CaptureToolbar = () => {
  const [mode, setMode] = useState<CaptureMode>("rectangle");
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState("");

  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isPointerInsideSelection, setIsPointerInsideSelection] =
    useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropError, setCropError] = useState("");

  const overlayRef = useRef<HTMLElement>(null);
  const startPointRef = useRef<Point | null>(null);
  const resizeHandleRef = useRef<ResizeHandle | null>(null);
  const initialSelectionRef = useRef<Selection | null>(null);
  const moveStartPointRef = useRef<Point | null>(null);
  const initialMoveSelectionRef = useRef<Selection | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI
      .getCaptureSnapshot()
      .then((dataUrl) => {
        if (!cancelled) {
          setSnapshot(dataUrl);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load desktop snapshot:", error);

        if (!cancelled) {
          setCaptureError("Could not load the desktop snapshot.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    void window.electronAPI.closeCaptureToolbar();
  };

  const handleModeChange = (nextMode: CaptureMode) => {
    setMode(nextMode);
    setIsOpen(false);
    setSelection(null);
    setIsSelecting(false);
    startPointRef.current = null;
  };

  const getPoint = (event: React.PointerEvent): Point => {
    const bounds = overlayRef.current?.getBoundingClientRect();
    if (!bounds) {
      return {
        x: 0,
        y: 0,
      };
    }

    return {
      x: Math.max(0, Math.min(event.clientX - bounds.left, bounds.width)),
      y: Math.max(0, Math.min(event.clientY - bounds.top, bounds.height)),
    };
  };

  const resizeSelection = (
    initial: Selection,
    handle: ResizeHandle,
    point: Point,
  ) => {
    const left = initial.x;
    const top = initial.y;
    const right = initial.x + initial.width;
    const bottom = initial.y + initial.height;

    const fixedX = handle.includes("left") ? right : left;
    const fixedY = handle.includes("top") ? bottom : top;

    return {
      x: Math.min(fixedX, point.x),
      y: Math.min(fixedY, point.y),
      width: Math.abs(point.x - fixedX),
      height: Math.abs(point.y - fixedY),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (resizeHandleRef.current) {
      return;
    }

    if (mode !== "rectangle" || !snapshot || isOpen) {
      return;
    }

    // Start selection only with the primary mouse button.
    if (event.button !== 0) {
      return;
    }

    const point = getPoint(event);

    if (
      selection &&
      point.x >= selection.x &&
      point.x <= selection.x + selection.width &&
      point.y >= selection.y &&
      point.y <= selection.y + selection.height
    ) {
      event.preventDefault();

      moveStartPointRef.current = point;
      initialMoveSelectionRef.current = { ...selection };

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    moveStartPointRef.current = null;
    initialMoveSelectionRef.current = null;

    startPointRef.current = point;
    setSelection({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });
    setIsSelecting(true);

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (moveStartPointRef.current && initialMoveSelectionRef.current) {
      moveStartPointRef.current = null;
      initialMoveSelectionRef.current = null;
      return;
    }

    if (resizeHandleRef.current) {
      resizeHandleRef.current = null;
      initialSelectionRef.current = null;
      return;
    }

    if (!isSelecting || !startPointRef.current) {
      return;
    }

    const start = startPointRef.current;
    const current = getPoint(event);

    const finalSelection: Selection = {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    };

    startPointRef.current = null;
    setIsSelecting(false);

    if (
      finalSelection.width < MIN_SELECTION_SIZE ||
      finalSelection.height < MIN_SELECTION_SIZE
    ) {
      setSelection(null);
      return;
    }

    setSelection(finalSelection);
  };

  const handlePointerCancel = () => {
    if (moveStartPointRef.current || initialMoveSelectionRef.current) {
      moveStartPointRef.current = null;
      initialMoveSelectionRef.current = null;
      return;
    }

    if (resizeHandleRef.current) {
      resizeHandleRef.current = null;
      initialSelectionRef.current = null;
      return;
    }

    startPointRef.current = null;
    setIsSelecting(false);
    setSelection(null);
  };

  const handleResizeStart = (
    event: React.PointerEvent<HTMLSpanElement>,
    handle: ResizeHandle,
  ) => {
    if (event.button !== 0 || !selection || isSelecting) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const overlay = overlayRef.current;
    if (!overlay) return;

    resizeHandleRef.current = handle;
    initialSelectionRef.current = { ...selection };

    overlay.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const resizeHandle = resizeHandleRef.current;
    const initialSelection = initialSelectionRef.current;

    if (resizeHandle && initialSelection) {
      const point = getPoint(event);
      setSelection(resizeSelection(initialSelection, resizeHandle, point));
      return;
    }
    const moveStart = moveStartPointRef.current;
    const initialMoveSelection = initialMoveSelectionRef.current;

    if (moveStart && initialMoveSelection) {
      const point = getPoint(event);
      const bounds = overlayRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      const deltaX = point.x - moveStart.x;
      const deltaY = point.y - moveStart.y;

      const maxX = Math.max(0, bounds.width - initialMoveSelection.width);

      const maxY = Math.max(0, bounds.height - initialMoveSelection.height);

      setSelection({
        ...initialMoveSelection,
        x: Math.max(0, Math.min(initialMoveSelection.x + deltaX, maxX)),
        y: Math.max(0, Math.min(initialMoveSelection.y + deltaY, maxY)),
      });

      return;
    }

    // Update the cursor when hovering over the selection.
    const point = getPoint(event);

    const isInside =
      selection !== null &&
      point.x >= selection.x &&
      point.x <= selection.x + selection.width &&
      point.y >= selection.y &&
      point.y <= selection.y + selection.height;

    setIsPointerInsideSelection(isInside);

    // 3. Draw a new selection.
    const start = startPointRef.current;

    if (!isSelecting || !start) {
      return;
    }

    setSelection({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(point.x - start.x),
      height: Math.abs(point.y - start.y),
    });
  };

  const handleConfirmSelection = async () => {
    if (isCropping || !snapshot) {
      return;
    }

    if (mode === "rectangle") {
      if (
        !selection ||
        selection.width < MIN_SELECTION_SIZE ||
        selection.height < MIN_SELECTION_SIZE
      ) {
        return;
      }
    }

    setIsCropping(true);
    setCropError("");

    try {
      if (mode === "rectangle" && selection) {
        const result = await cropImage(snapshot, selection);
        setCroppedImage(result);
      } else {
        setCroppedImage(snapshot);
      }
      console.log(
        "Cropped image:",
        mode === "rectangle" ? "rectangle" : "full screen",
      );
      console.log("Screenshot image generated successfully.");
    } catch (error) {
      console.error("Failed to crop screenshot:", error);
      setCropError("Could not generate the screenshot. Please try again.");
    } finally {
      setIsCropping(false);
    }
  };

  const getConfirmButtonPosition = (currentSelection: Selection) => {
    const bounds = overlayRef.current?.getBoundingClientRect();

    const overlayWidth = bounds?.width ?? window.innerWidth;
    const overlayHeight = bounds?.height ?? window.innerHeight;

    const buttonSize = 36;
    const gap = 8;
    const edgePadding = 8;

    const selectionRight = currentSelection.x + currentSelection.width;
    const selectionBottom = currentSelection.y + currentSelection.height;

    const fitsBelow =
      selectionBottom + gap + buttonSize <= overlayHeight - edgePadding;

    const fitsRight = selectionRight + buttonSize <= overlayWidth - edgePadding;

    const top = fitsBelow
      ? selectionBottom + gap
      : Math.max(edgePadding, currentSelection.y - buttonSize - gap);

    const left = fitsRight
      ? selectionRight - buttonSize
      : Math.max(
          edgePadding,
          currentSelection.x + currentSelection.width - buttonSize,
        );

    return {
      position: "absolute" as const,
      top,
      left,
      width: buttonSize,
      height: buttonSize,
    };
  };

  const handleBackToSelection = () => {
    console.log("Back to selection clicked");
    setCroppedImage(null);
    setCropError("");
    setIsCropping(false);
  };

  return (
    <main
      ref={overlayRef}
      className="capture-overlay"
      style={{ cursor: isPointerInsideSelection ? "move" : "crosshair" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {croppedImage ? (
        <div className="capture-preview">
          <div className="capture-preview__header">
            <h2>Screenshot Preview</h2>

            <button type="button" onClick={handleBackToSelection}>
              Back to Selection
            </button>
          </div>

          <div className="capture-preview__image-container">
            <img
              src={croppedImage}
              alt="Cropped screenshot preview"
              className="capture-preview__image"
            />
          </div>

          <p>
            Image dimensions:{" "}
            {selection
              ? `${Math.round((selection.width * 1366) / 1041)} × ${Math.round((selection.height * 768) / 720)} px`
              : "Full screen"}
          </p>
        </div>
      ) : (
        <>
          {snapshot && (
            <div
              className="capture-overlay__snapshot"
              style={{ backgroundImage: `url("${snapshot}")` }}
            />
          )}
          <div className="capture-overlay__backdrop" />
          {mode === "rectangle" && selection && snapshot && (
            <div
              className="capture-overlay__selection-reveal"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.width,
                height: selection.height,
                backgroundImage: `url("${snapshot}")`,
                backgroundPosition: `-${selection.x}px -${selection.y}px`,
                backgroundSize: "100vw 100vh",
              }}
            >
              <div className="capture-overlay__selection-border">
                <span
                  className="capture-overlay__handle capture-overlay__handle--top-left"
                  onPointerDown={(event) =>
                    handleResizeStart(event, "top-left")
                  }
                />
                <span
                  className="capture-overlay__handle capture-overlay__handle--top-right"
                  onPointerDown={(event) =>
                    handleResizeStart(event, "top-right")
                  }
                />
                <span
                  className="capture-overlay__handle capture-overlay__handle--bottom-left"
                  onPointerDown={(event) =>
                    handleResizeStart(event, "bottom-left")
                  }
                />
                <span
                  className="capture-overlay__handle capture-overlay__handle--bottom-right"
                  onPointerDown={(event) =>
                    handleResizeStart(event, "bottom-right")
                  }
                />
              </div>
            </div>
          )}

          {mode === "rectangle" && selection && snapshot && (
            <button
              type="button"
              className="capture-overlay__confirm"
              aria-label="Confirm selection"
              title="Confirm selection"
              style={getConfirmButtonPosition(selection)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={handleConfirmSelection}
            >
              <Check size={19} />
            </button>
          )}

          {captureError && (
            <div className="capture-overlay__error" role="alert">
              {captureError}
            </div>
          )}

          <section
            className="capture-toolbar"
            aria-label="Screenshot capture toolbar"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="capture-toolbar__logo" aria-label="Screenshot App">
              <Aperture size={21} />
            </div>

            <div className="capture-toolbar__mode-wrapper">
              <button
                type="button"
                className="capture-toolbar__mode"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onClick={() => setIsOpen((open) => !open)}
              >
                {mode === "rectangle" ? (
                  <Crop size={17} />
                ) : (
                  <Monitor size={17} />
                )}

                <span>{mode === "rectangle" ? "Rectangle" : "Screen"}</span>
                <ChevronDown size={15} className={isOpen ? "is-rotated" : ""} />
              </button>

              {isOpen && (
                <div className="capture-toolbar__dropdown" role="listbox">
                  <button
                    type="button"
                    role="option"
                    aria-selected={mode === "rectangle"}
                    onClick={() => handleModeChange("rectangle")}
                  >
                    <Crop size={17} />
                    <span>Rectangle</span>
                    {mode === "rectangle" && <Check size={15} />}
                  </button>

                  <button
                    type="button"
                    role="option"
                    aria-selected={mode === "screen"}
                    onClick={() => handleModeChange("screen")}
                  >
                    <Monitor size={17} />
                    <span>Screen</span>
                    {mode === "screen" && <Check size={15} />}
                  </button>
                </div>
              )}
            </div>

            <div className="capture-toolbar__divider" />

            {mode === "screen" && (
              <button
                type="button"
                className="capture-toolbar__confirm"
                aria-label="Confirm full screen"
                title="Confirm full screen"
                onClick={handleConfirmSelection}
              >
                <Check size={19} />
              </button>
            )}

            <button
              type="button"
              className="capture-toolbar__close"
              aria-label="Cancel capture"
              title="Cancel capture"
              onClick={handleClose}
            >
              <X size={19} />
            </button>
          </section>
        </>
      )}
    </main>
  );
};

export default CaptureToolbar;

const cropImage = (imageUrl: string, selection: Selection): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      console.log("Snapshot dimensions:", {
        width: image.naturalWidth,
        height: image.naturalHeight,
      });

      console.log("Overlay dimensions:", {
        width: window.innerWidth,
        height: window.innerHeight,
      });

      console.log("Selected rectangle:", selection);

      const scaleX = image.naturalWidth / window.innerWidth;
      const scaleY = image.naturalHeight / window.innerHeight;

      const sourceX = Math.round(selection.x * scaleX);
      const sourceY = Math.round(selection.y * scaleY);
      const sourceWidth = Math.round(selection.width * scaleX);
      const sourceHeight = Math.round(selection.height * scaleY);

      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not create the crop canvas."));
        return;
      }

      console.log("Final crop dimensions:", {
        width: canvas.width,
        height: canvas.height,
      });

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight,
      );

      resolve(canvas.toDataURL("image/png"));
    };

    image.onerror = () => {
      reject(new Error("Could not load the screenshot for cropping."));
    };

    image.src = imageUrl;
  });
};
