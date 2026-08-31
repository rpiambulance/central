import { Display, type Board } from './display';
import styles from './headsup.module.css';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const metadata = { title: 'Heads up — RPI Ambulance' };
export const dynamic = 'force-dynamic';

/**
 * The station whiteboard, as a screen on the wall sees it.
 *
 * The token in the URL is the whole credential: a television cannot sign in,
 * and the API is what decides whether this particular link still opens
 * anything. Rendered on the server first so a screen coming up after a power
 * cut has the board on it immediately, rather than a blank waiting for
 * JavaScript nobody is there to help along.
 */
export default async function HeadsupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = ((await searchParams).token ?? '').trim();

  const board = token
    ? await fetch(
        `${API_URL}/v1/headsup/board?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      )
        .then((res) => (res.ok ? (res.json() as Promise<Board>) : null))
        .catch(() => null)
    : null;

  if (!board) {
    return (
      <div className={styles.problem}>
        <p>
          This display needs its own link.
          <br />
          Ask an officer for one, or check the link this screen is set to.
        </p>
      </div>
    );
  }

  return <Display initial={board} token={token} />;
}
