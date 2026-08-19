'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/**
 * What a member sees when a page fails.
 *
 * The message and digest are on the page rather than only in a log: without
 * them the framework's default says "this page couldn't load" and nobody —
 * member or officer — can say what went wrong or repeat it usefully.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page failed to render:', error);
  }, [error]);

  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          This page didn&apos;t load. Trying again often works; if it keeps
          happening, send an officer what is written below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs whitespace-pre-wrap">
          {error.message || 'No message was given.'}
          {error.digest ? `\n\nReference: ${error.digest}` : ''}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => reset()}>
            Try again
          </Button>
          <Button size="sm" variant="outline" render={<a href="/" />}>
            Back to the dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
