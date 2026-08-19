'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export type ViewableDocument = {
  id: string;
  fileName: string;
};

/** What the browser can show inline, by extension. */
function kindOf(fileName: string): 'pdf' | 'image' | 'other' {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic'].includes(ext)) {
    return 'image';
  }
  return 'other';
}

/**
 * Certification documents, read without leaving the page.
 *
 * A panel rather than a centred modal: verifying is a two-handed job — read
 * the card, then approve or reject — and a panel leaves the record it belongs
 * to on screen beside it. PDFs go in an iframe and images in an img tag,
 * which is the browser's own viewer in both cases; embedding a JavaScript PDF
 * renderer would add a megabyte to the bundle to do worse.
 *
 * Anything the browser will not show inline gets a download link instead of a
 * blank frame, and every file keeps an "open in a new tab" escape hatch —
 * mobile Safari in particular refuses to render a PDF in an iframe.
 */
export function DocumentViewer({
  documents,
  label = 'View',
  title,
}: {
  documents: ViewableDocument[];
  label?: string;
  /** What the documents belong to, e.g. "NYS EMT — Jordan Ellis". */
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!documents.length) {
    return <span className="text-sm text-muted-foreground">&mdash;</span>;
  }

  const current = documents[Math.min(index, documents.length - 1)];
  const href = `/certifications/documents/${current.id}`;
  const kind = kindOf(current.fileName);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
      >
        {label}
        {documents.length > 1 ? ` (${documents.length})` : ''}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
        >
          <SheetHeader className="border-b">
            <SheetTitle className="text-base">
              {title ?? 'Document'}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <span className="truncate">{current.fileName}</span>
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                open in a new tab
              </a>
            </SheetDescription>
          </SheetHeader>

          {documents.length > 1 ? (
            <div className="flex flex-wrap gap-1 border-b px-4 py-2">
              {documents.map((doc, i) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`max-w-48 truncate rounded-md border px-2 py-1 text-xs ${
                    i === index
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {doc.fileName}
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 bg-muted/30">
            {kind === 'pdf' ? (
              <iframe
                key={current.id}
                src={href}
                title={current.fileName}
                className="size-full border-0"
              />
            ) : kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.id}
                src={href}
                alt={current.fileName}
                className="mx-auto max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  A {current.fileName.split('.').pop()?.toUpperCase()} file
                  cannot be shown here.
                </p>
                <Button size="sm" variant="outline" render={<a href={href} download />}>
                  Download {current.fileName}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
