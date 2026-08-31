import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = { title: 'Request sent — RPI Ambulance' };

export default function ThankYouPage() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>Thanks — that&apos;s with us</CardTitle>
        <CardDescription>
          An officer will look at it and get in touch by email. There is
          nothing else you need to do.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
