import { auth, devLoginEnabled, signIn } from '@/auth';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Me = {
  id: number;
  firstName: string;
  lastName: string;
  credentials: Array<{ type: { name: string }; title: string | null }>;
} | null;

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>RPI Ambulance Member Portal</CardTitle>
          <CardDescription>Sign in with your RPIA account.</CardDescription>
        </CardHeader>
        {devLoginEnabled ? (
          <CardContent>
            <form
              action={async (formData: FormData) => {
                'use server';
                await signIn('dev-login', {
                  username: formData.get('username'),
                  password: formData.get('password'),
                  redirectTo: '/',
                });
              }}
              className="space-y-2 border-t pt-4"
            >
              <p className="text-xs text-muted-foreground">
                Dev login (local only) — default dev / dev
              </p>
              <input
                name="username"
                placeholder="Username"
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
              />
              <Button type="submit" size="sm" className="w-full">
                Sign in without Keycloak redirect
              </Button>
            </form>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  let me: Me = null;
  let inactive = false;
  try {
    me = await api<Me>('/v1/members/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      inactive = true;
    } else {
      throw error;
    }
  }

  if (inactive) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Membership inactive</CardTitle>
          <CardDescription>
            Your membership is currently inactive. To become active again,
            please contact an officer.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{me ? `, ${me.firstName}` : ''}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My credentials</CardTitle>
            <CardDescription>
              {me?.credentials.length
                ? me.credentials.map((c) => c.title ?? c.type.name).join(', ')
                : 'None yet'}
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Night crews</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </div>
  );
}
