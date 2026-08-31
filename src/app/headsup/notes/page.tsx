import { api } from '@/lib/api';
import { displayName } from '@/lib/name';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { addMishap, addNote, removeMishap, removeNote } from './actions';

type Author = {
  firstName: string;
  preferredFirstName?: string | null;
  lastName: string;
} | null;

type Note = {
  id: number;
  body: string;
  createdAt: string;
  createdBy: Author;
};

type Mishap = {
  id: number;
  note: string | null;
  occurredAt: string;
  createdBy: Author;
};

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Writing on the whiteboard.
 *
 * Anybody signed in may add or take down either kind of entry, because that
 * is what a whiteboard is — the alternative is a board nobody can correct at
 * two in the morning. Nothing is really deleted, so who wrote and who rubbed
 * out is always answerable.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { error, done } = await searchParams;
  const [notes, mishaps, hour12] = await Promise.all([
    api<Note[]>('/v1/headsup/notes'),
    api<Mishap[]>('/v1/headsup/mishaps'),
    prefers12Hour(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Whiteboard"
        description="Notes and dispatch mishaps, as they appear on the screens in the bay."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {done === 'note'
            ? 'Added — it is on the board now.'
            : done === 'note-removed'
              ? 'Taken down.'
              : done === 'mishap'
                ? 'Logged, and the count on the board has gone up.'
                : 'Removed, and the count has gone back down.'}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>
              Whatever the crew coming on should know. Shown on every display.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addNote} className="flex items-end gap-2">
              <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
                New note
                <input
                  name="body"
                  required
                  maxLength={500}
                  placeholder="Rig 2 is at the shop until Thursday"
                  className={FIELD}
                />
              </label>
              <Button type="submit" size="sm">
                Put it up
              </Button>
            </form>

            {notes.length ? (
              <ul className="divide-y rounded-md border">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="flex items-start gap-3 px-3 py-2 text-sm"
                  >
                    <div className="flex-1">
                      <p>{note.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {note.createdBy ? displayName(note.createdBy) : 'Someone'}
                        {' · '}
                        {formatDateTime(note.createdAt, hour12)}
                      </p>
                    </div>
                    <form action={removeNote.bind(null, note.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                      >
                        Take down
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing on the board.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispatch mishaps</CardTitle>
            <CardDescription>
              The running count on the board. Say what happened if you have a
              moment — the number is the point, the note is for whoever asks
              about it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addMishap} className="flex items-end gap-2">
              <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
                What happened (optional)
                <input
                  name="note"
                  maxLength={500}
                  placeholder="Sent us to the wrong side of campus"
                  className={FIELD}
                />
              </label>
              <Button type="submit" size="sm">
                Log one
              </Button>
            </form>

            {mishaps.length ? (
              <ul className="divide-y rounded-md border">
                {mishaps.map((mishap) => (
                  <li
                    key={mishap.id}
                    className="flex items-start gap-3 px-3 py-2 text-sm"
                  >
                    <div className="flex-1">
                      <p>{mishap.note ?? <span className="text-muted-foreground">No detail given</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {mishap.createdBy
                          ? displayName(mishap.createdBy)
                          : 'Someone'}
                        {' · '}
                        {formatDateTime(mishap.occurredAt, hour12)}
                      </p>
                    </div>
                    <form action={removeMishap.bind(null, mishap.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                      >
                        Remove
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                None logged since the count was last cleared.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
