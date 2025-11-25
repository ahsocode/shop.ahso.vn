"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProcessedImage = {
  file: File;
  previewUrl: string;
};

type ImageCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  fileName?: string;
  aspectRatio?: number;
  onOpenChange(open: boolean): void;
  onComplete(result: ProcessedImage): void;
};

const BASE_WIDTH = 320;

export function ImageCropDialog(props: ImageCropDialogProps) {
  const {
    open,
    imageSrc,
    fileName,
    aspectRatio = 1,
    onOpenChange,
    onComplete,
  } = props;

  const cropWidth = BASE_WIDTH;
  const cropHeight = useMemo(
    () => Math.max(120, Math.round(cropWidth / Math.max(aspectRatio, 0.1))),
    [aspectRatio, cropWidth],
  );

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.1);
  const [maxZoom] = useState(4);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [loadingImage, setLoadingImage] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTranslateX: number;
    startTranslateY: number;
  } | null>(null);

  // Reset state khi đóng/mở dialog
  useEffect(() => {
    if (!imageSrc || !open) {
      setImageSize(null);
      setZoom(1);
      setTranslate({ x: 0, y: 0 });
      setError(null);
      setLoadingImage(false);
      setProcessing(false);
      setIsDragging(false);
      return;
    }

    setLoadingImage(true);
    setError(null);
    
    const img = new Image();
    img.onload = () => {
      const nextImageSize = { width: img.width, height: img.height };
      
      // Tính zoom để fit ảnh vào crop area MÀ KHÔNG méo tỷ lệ
      const scaleToFitWidth = cropWidth / img.width;
      const scaleToFitHeight = cropHeight / img.height;
      const initialZoom = Math.min(scaleToFitWidth, scaleToFitHeight);
      
      // minZoom cho phép thu nhỏ hơn nữa
      const calculatedMinZoom = Math.max(0.1, initialZoom * 0.5);
      
      setImageSize(nextImageSize);
      setMinZoom(calculatedMinZoom);
      setZoom(initialZoom);
      
      // Căn giữa ảnh trong crop area
      const scaledWidth = img.width * initialZoom;
      const scaledHeight = img.height * initialZoom;
      setTranslate({
        x: (cropWidth - scaledWidth) / 2,
        y: (cropHeight - scaledHeight) / 2,
      });
      
      setError(null);
      setLoadingImage(false);
    };
    
    img.onerror = () => {
      setError("Không thể tải ảnh. Vui lòng thử lại với ảnh khác.");
      setLoadingImage(false);
    };
    
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
  }, [imageSrc, open, cropHeight, cropWidth]);

  const scaledWidth = imageSize ? imageSize.width * zoom : 0;
  const scaledHeight = imageSize ? imageSize.height * zoom : 0;

  const dragEnabled = Boolean(imageSize) && !processing && !loadingImage;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragEnabled) return;
    event.preventDefault();
    
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: translate.x,
      startTranslateY: translate.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !dragEnabled || !imageSize) return;
    event.preventDefault();
    
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const nextX = dragRef.current.startTranslateX + deltaX;
    const nextY = dragRef.current.startTranslateY + deltaY;
    
    setTranslate({
      x: nextX,
      y: nextY,
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    event.preventDefault();
    
    setIsDragging(false);
    
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const handleZoomChange = (value: number) => {
    if (!imageSize) return;
    
    const nextZoom = Math.max(minZoom, Math.min(maxZoom, value));
    
    // Tính toán lại vị trí để giữ điểm trung tâm không đổi
    const prevScaledWidth = scaledWidth || 1;
    const prevScaledHeight = scaledHeight || 1;
    
    // Tìm điểm trung tâm hiện tại trong không gian ảnh gốc (0-1)
    const centerX = (-translate.x + cropWidth / 2) / prevScaledWidth;
    const centerY = (-translate.y + cropHeight / 2) / prevScaledHeight;
    
    // Tính kích thước mới
    const newScaledWidth = imageSize.width * nextZoom;
    const newScaledHeight = imageSize.height * nextZoom;
    
    // Tính vị trí mới để giữ điểm trung tâm
    const desiredTranslateX = -(centerX * newScaledWidth - cropWidth / 2);
    const desiredTranslateY = -(centerY * newScaledHeight - cropHeight / 2);

    setZoom(nextZoom);
    setTranslate({
      x: desiredTranslateX,
      y: desiredTranslateY,
    });
  };

  const handleZoomIn = () => {
    handleZoomChange(zoom + 0.2);
  };

  const handleZoomOut = () => {
    handleZoomChange(zoom - 0.2);
  };

  const handleCancel = () => {
    if (processing) return;
    onOpenChange(false);
  };

  const handleApply = async () => {
    if (!imageSrc || !imageSize) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const result = await cropImageToWebp({
        imageSrc,
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        zoom,
        translate,
        cropWidth,
        cropHeight,
        fileName,
      });
      onComplete(result);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể xử lý ảnh, vui lòng thử lại";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const zoomPercentage = imageSize 
    ? Math.round(((zoom - minZoom) / (maxZoom - minZoom)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">Chỉnh sửa ảnh</DialogTitle>
          <DialogDescription className="text-sm">
            Kéo ảnh để canh vị trí mong muốn và dùng thanh trượt để phóng to/thu nhỏ. 
            Ảnh sẽ được chuyển sang định dạng WebP trước khi tải lên.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Crop Area */}
          <div
            className="relative mx-auto rounded-lg border-2 border-gray-300 bg-linear-to-br from-gray-100 to-gray-200 overflow-hidden shadow-inner"
            style={{
              width: cropWidth,
              height: cropHeight,
              touchAction: dragEnabled ? "none" : "auto",
              cursor: isDragging ? "grabbing" : dragEnabled ? "grab" : "default",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Loading State */}
            {(!imageSrc || loadingImage) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-600 bg-gray-50">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Đang tải ảnh...</span>
              </div>
            )}

            {/* Image */}
            {imageSrc && !loadingImage && imageSize && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="Cần chỉnh sửa"
                draggable={false}
                className="absolute select-none pointer-events-none"
                style={{
                  width: scaledWidth,
                  height: scaledHeight,
                  transform: `translate(${translate.x}px, ${translate.y}px)`,
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
              />
            )}

            {/* Overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_0_999px_rgba(0,0,0,0.3)]" />
            <div className="pointer-events-none absolute inset-0 border-2 border-white/60 rounded-lg" />
            
            {/* Corner Markers */}
            <div className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/80" />
            <div className="pointer-events-none absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/80" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/80" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/80" />
          </div>

          {/* Zoom Controls */}
          {imageSrc && imageSize && !loadingImage && (
            <div className="space-y-3 px-1">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= minZoom || processing}
                  className="h-8 w-8 shrink-0"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 space-y-1.5">
                  <input
                    type="range"
                    min={minZoom}
                    max={Math.max(minZoom, maxZoom)}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    disabled={processing}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: `linear-gradient(to right, #2563eb 0%, #2563eb ${zoomPercentage}%, #e5e7eb ${zoomPercentage}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Thu nhỏ</span>
                    <span className="font-medium text-gray-700">{Math.round(zoom * 100)}%</span>
                    <span>Phóng to</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= maxZoom || processing}
                  className="h-8 w-8 shrink-0"
                  title="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Hint */}
              <p className="text-xs text-center text-gray-500">
                💡 Kéo ảnh để di chuyển, dùng thanh trượt hoặc nút +/- để zoom
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <span className="text-red-500 font-bold">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel} 
            disabled={processing}
            className="min-w-20"
          >
            Huỷ
          </Button>
          <Button 
            type="button" 
            onClick={handleApply} 
            disabled={processing || !imageSize || loadingImage}
            className="min-w-24"
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {processing ? "Đang xử lý..." : "Áp dụng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ProcessedImage };

async function cropImageToWebp(options: {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  translate: { x: number; y: number };
  cropWidth: number;
  cropHeight: number;
  fileName?: string;
}): Promise<ProcessedImage> {
  const {
    imageSrc,
    imageWidth,
    imageHeight,
    zoom,
    translate,
    cropWidth,
    cropHeight,
    fileName,
  } = options;

  // Load image
  const image = await loadImage(imageSrc);
  
  // Create canvas với kích thước crop area
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Không thể khởi tạo canvas để xử lý ảnh");
  }

  // Fill background white (cho ảnh có nền trong suốt)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cropWidth, cropHeight);
  
  // Vùng visible trong crop area (tọa độ trong không gian ảnh đã scale)
  const visibleLeft = -translate.x;
  const visibleTop = -translate.y;
  
  // Chuyển về tọa độ ảnh gốc
  const sourceX = visibleLeft / zoom;
  const sourceY = visibleTop / zoom;
  const sourceWidth = cropWidth / zoom;
  const sourceHeight = cropHeight / zoom;
  
  // Clamp để không vượt quá biên ảnh gốc
  const clampedSourceX = Math.max(0, Math.min(imageWidth, sourceX));
  const clampedSourceY = Math.max(0, Math.min(imageHeight, sourceY));
  const clampedSourceWidth = Math.min(sourceWidth, imageWidth - clampedSourceX);
  const clampedSourceHeight = Math.min(sourceHeight, imageHeight - clampedSourceY);
  
  // Tính vị trí đích trên canvas
  const destX = (clampedSourceX - sourceX) * zoom;
  const destY = (clampedSourceY - sourceY) * zoom;
  const destWidth = clampedSourceWidth * zoom;
  const destHeight = clampedSourceHeight * zoom;
  
  // Vẽ ảnh
  ctx.drawImage(
    image,
    clampedSourceX, clampedSourceY, clampedSourceWidth, clampedSourceHeight,
    destX, destY, destWidth, destHeight
  );

  // Convert to WebP blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Không thể tạo ảnh WebP"));
        }
      },
      "image/webp",
      0.92,
    );
  });

  // Create file
  const safeName = ensureWebpFileName(fileName);
  const file = new File([blob], safeName, { type: "image/webp" });
  const previewUrl = URL.createObjectURL(blob);

  return { file, previewUrl };
}

function ensureWebpFileName(name?: string): string {
  const fallback = `cropped-${Date.now()}.webp`;
  if (!name) return fallback;
  
  const baseName = name.replace(/\.[^.]+$/, "");
  return `${baseName}.webp`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể đọc ảnh nguồn"));
    
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}
