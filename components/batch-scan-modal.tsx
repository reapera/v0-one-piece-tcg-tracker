'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScanLine, ImagePlus, CircleCheckBig, CircleX, TriangleAlert, CopyPlus, Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/compress-image';

interface ScanItem {
  file: File;
  preview: string;
  status: 'pending' | 'scanning' | 'success' | 'warning' | 'duplicate' | 'error';
  cardName?: string;
  cardNumber?: string;
  warning?: string;
  error?: string;
}

interface BatchScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when scanning completes so the parent can refresh its card list */
  onComplete?: () => void;
}

export function BatchScanModal({ open, onOpenChange, onComplete }: BatchScanModalProps) {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setItems([]);
    setIsScanning(false);
    setIsDone(false);
    setCurrentIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    if (isScanning) return; // block close mid-scan
    if (isDone && onComplete) onComplete();
    resetState();
    onOpenChange(false);
  }, [isScanning, isDone, onComplete, resetState, onOpenChange]);

  // ── file selection ────────────────────────────────────────────────────────

  const addFiles = useCallback((fileList: FileList) => {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;

    incoming.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setItems((prev) => {
          const idx = prev.findIndex((it) => it.file === file);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], preview: e.target?.result as string };
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });

    setItems((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        file,
        preview: '',
        status: 'pending' as const,
      })),
    ]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── scanning ──────────────────────────────────────────────────────────────

  const startScan = async () => {
    if (!items.length || isScanning) return;
    setIsScanning(true);
    setIsDone(false);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      setItems((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'scanning' };
        return updated;
      });

      try {
        // compress before sending to stay within Gemini limits
        const compressed = await compressImage(items[i].file);
        const base64 = await blobToBase64(compressed);

        const res = await fetch('/api/batch-scan-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [{ image: base64, mimeType: 'image/jpeg' }],
          }),
        });

        const data = await res.json();
        const result = data?.results?.[0];

        if (!res.ok || !result) {
          throw new Error(data?.error ?? 'Unexpected response from server');
        }

        if (result.status === 'error') {
          setItems((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'error', error: result.error };
            return updated;
          });
        } else if (result.status === 'duplicate') {
          setItems((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: 'duplicate',
              cardName: result.card?.cardName,
              cardNumber: result.card?.cardNumber,
              warning: result.message,
            };
            return updated;
          });
        } else {
          setItems((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: result.warning ? 'warning' : 'success',
              cardName: result.card?.cardName,
              cardNumber: result.card?.cardNumber,
              warning: result.warning,
            };
            return updated;
          });
        }
      } catch (err) {
        setItems((prev) => {
          const updated = [...prev];
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          };
          return updated;
        });
      }
    }

    setCurrentIndex(-1);
    setIsScanning(false);
    setIsDone(true);
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const succeeded = items.filter((it) => it.status === 'success' || it.status === 'warning').length;
  const duplicates = items.filter((it) => it.status === 'duplicate').length;
  const failed = items.filter((it) => it.status === 'error').length;
  const pending = items.filter((it) => it.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Batch Scan Cards
          </DialogTitle>
          <DialogDescription>
            Select multiple card photos. Each will be scanned by Gemini and saved automatically
            with quantity&nbsp;1 and price&nbsp;1.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        {!isScanning && !isDone && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition hover:border-primary/50 hover:bg-primary/5"
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Click or drag &amp; drop photos here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WEBP — select as many as you like
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Progress bar */}
        {isScanning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Scanning {currentIndex + 1} of {items.length}…</span>
              <span>{succeeded} saved</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Done summary */}
        {isDone && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <span className="font-semibold text-foreground">{succeeded}</span>
            <span className="text-muted-foreground"> saved</span>
            {duplicates > 0 && (
              <>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="font-semibold text-yellow-400">{duplicates}</span>
                <span className="text-muted-foreground"> qty bumped</span>
              </>
            )}
            {failed > 0 && (
              <>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="font-semibold text-destructive">{failed}</span>
                <span className="text-muted-foreground"> failed</span>
              </>
            )}
          </div>
        )}

        {/* Item list */}
        {items.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  {/* thumbnail */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* status overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {item.status === 'pending' && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                        </div>
                      )}
                      {item.status === 'scanning' && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                      {(item.status === 'success' || item.status === 'warning') && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <CircleCheckBig className="h-5 w-5 text-green-400" />
                        </div>
                      )}
                      {item.status === 'duplicate' && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <CopyPlus className="h-5 w-5 text-yellow-400" />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <CircleX className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                    </div>

                    {/* remove button (only when not scanning) */}
                    {item.status === 'pending' && !isScanning && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* label */}
                  <div className="px-2 py-1.5 text-xs">
                    {item.status === 'success' || item.status === 'warning' ? (
                      <>
                        <p className="truncate font-medium text-foreground">
                          {item.cardName ?? 'Unknown Card'}
                        </p>
                        <p className="font-mono text-primary">{item.cardNumber ?? '—'}</p>
                        {item.warning && (
                          <p className="mt-0.5 flex items-center gap-1 text-yellow-400">
                            <TriangleAlert className="h-3 w-3 shrink-0" />
                            Defaults used
                          </p>
                        )}
                      </>
                    ) : item.status === 'duplicate' ? (
                      <>
                        <p className="truncate font-medium text-foreground">
                          {item.cardName ?? 'Unknown Card'}
                        </p>
                        <p className="font-mono text-primary">{item.cardNumber ?? '—'}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-yellow-400">
                          <CopyPlus className="h-3 w-3 shrink-0" />
                          Qty bumped
                        </p>
                      </>
                    ) : item.status === 'error' ? (
                      <p className="text-destructive line-clamp-2">{item.error}</p>
                    ) : (
                      <p className="truncate text-muted-foreground">{item.file.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 gap-2">
          {isDone ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isScanning}>
                Cancel
              </Button>
              {!isScanning && items.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add More
                </Button>
              )}
              <Button
                onClick={startScan}
                disabled={isScanning || pending === 0}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan {pending > 0 ? `${pending} Card${pending > 1 ? 's' : ''}` : 'Cards'}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── utility ───────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // strip "data:<mime>;base64," prefix
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
