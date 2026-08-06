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
import { Camera, ImageIcon, ScanLine, CircleCheckBig, CircleX, TriangleAlert, CopyPlus, Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/compress-image';
import { supabase } from '@/lib/supabase';

interface ScanItem {
  file: File;
  preview: string;
  imageUrl?: string;
  isUploading: boolean;
  status: 'pending' | 'scanning' | 'success' | 'warning' | 'duplicate' | 'error';
  cardName?: string;
  cardNumber?: string;
  warning?: string;
  error?: string;
}

interface BatchScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BatchScanModal({ open, onOpenChange, onComplete }: BatchScanModalProps) {
  const [items, setItems] = useState<ScanItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => { if (it.preview) URL.revokeObjectURL(it.preview); });
      return [];
    });
    setIsScanning(false);
    setIsDone(false);
    setCurrentIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    if (isScanning) return;
    if (isDone && onComplete) onComplete();
    resetState();
    onOpenChange(false);
  }, [isScanning, isDone, onComplete, resetState, onOpenChange]);

  const processFile = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);

    setItems((prev) => [...prev, {
      file,
      preview,
      isUploading: true,
      status: 'pending',
    }]);

    try {
      const compressed = await compressImage(file, 200 * 1024);

      const path = `${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('card-images')
        .upload(path, compressed, { contentType: 'image/jpeg' });

      let imageUrl: string | undefined;
      if (uploadError) {
        console.error('[batch-scan] Storage upload failed:', uploadError.message);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('card-images')
          .getPublicUrl(path);
        imageUrl = publicUrl;
      }

      setItems((prev) => {
        const idx = prev.findIndex((it) => it.file === file);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], imageUrl, isUploading: false };
        return updated;
      });
    } catch (err) {
      console.error('[batch-scan] processFile error:', err);
      setItems((prev) => {
        const idx = prev.findIndex((it) => it.file === file);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isUploading: false };
        return updated;
      });
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    files.forEach((f) => processFile(f));
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    files.forEach((f) => processFile(f));
  }, [processFile]);

  const removeItem = (index: number) => {
    setItems((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const startScan = async () => {
    if (!items.length || isScanning) return;

    const snapshot = [...items];
    setIsScanning(true);
    setIsDone(false);

    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].status !== 'pending') continue;

      setCurrentIndex(i);
      setItems((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'scanning' };
        return updated;
      });

      try {
        const { file, imageUrl } = snapshot[i];

        const compressed = await compressImage(file, 200 * 1024);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/batch-scan-cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            images: [{ image: base64, mimeType: 'image/jpeg', imageUrl }],
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

  const anyUploading = items.some((it) => it.isUploading);
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
            Take photos or choose from your gallery. Each image is uploaded and scanned
            by Gemini, then saved with quantity&nbsp;1 and price&nbsp;1.
          </DialogDescription>
        </DialogHeader>

        {!isScanning && (
          <div className="flex gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isDone}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isDone}
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Choose from Gallery
            </Button>
          </div>
        )}

        {!isScanning && !isDone && items.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Or drag &amp; drop photos here
            </p>
          </div>
        )}

        {anyUploading && !isScanning && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading photos…
          </p>
        )}

        {isScanning && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Scanning {currentIndex + 1} of {items.length}…</span>
              <span>{succeeded + duplicates} processed</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

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

        {items.length > 0 && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                    {item.preview ? (
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {item.isUploading && (
                        <div className="rounded-full bg-black/60 p-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!item.isUploading && item.status === 'pending' && (
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

                    {item.status === 'pending' && !isScanning && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="px-2 py-1.5 text-xs">
                    {item.isUploading ? (
                      <p className="text-muted-foreground">Uploading…</p>
                    ) : item.status === 'success' || item.status === 'warning' ? (
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
              <Button
                onClick={startScan}
                disabled={isScanning || pending === 0 || anyUploading}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : anyUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
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
