import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = {
  title: 'Request received — RPI Ambulance',
};

const AGENCY_SITE = 'https://rpiambulance.com';

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ tokens?: string }>;
}) {
  const { tokens } = await searchParams;
  // Tokens are the requester's own status links, handed straight back so they
  // can follow the request without waiting for the email to arrive.
  const list = (tokens ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => /^[a-f0-9]{16,}$/i.test(token));
  const many = list.length > 1;

  return (
    <div className="mx-auto mt-12 max-w-xl px-4">
      <Card>
        <CardHeader>
          <CardTitle>Thank you for your request</CardTitle>
          <CardDescription>
            {many
              ? `We've received your ${list.length} requests and emailed you a link to follow each one.`
              : "We've received your request and emailed you a link to follow it."}{' '}
            An officer will be in touch — you can reply to any follow-up
            questions on the status page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {list.length ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {many ? 'Your requests' : 'Your request'}
              </p>
              <ul className="space-y-1 text-sm">
                {list.map((token, index) => (
                  <li key={token}>
                    <Link
                      href={`/request-coverage/status/${token}`}
                      className="underline underline-offset-2"
                    >
                      {many ? `Track request ${index + 1}` : 'Track this request'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-4 border-t pt-4 text-sm">
            <Link
              href="/request-coverage"
              className="underline underline-offset-2"
            >
              Submit another request
            </Link>
            <a
              href={AGENCY_SITE}
              className="underline underline-offset-2 text-muted-foreground"
            >
              Back to rpiambulance.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
