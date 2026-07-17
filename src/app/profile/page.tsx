import { api } from '@/lib/api';
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
import { updateNavLayout, updateProfile } from './actions';

type Me = {
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  cellPhone: string | null;
  homePhone: string | null;
  localAddress: string | null;
  homeAddress: string | null;
  navLayout: 'sidebar' | 'topnav';
};

const FIELD =
  'w-full rounded-md border bg-transparent px-3 py-1.5 text-sm';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await api<Me>('/v1/members/me');

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your contact information and portal preferences."
      />
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact information</CardTitle>
            <CardDescription>
              {me.firstName} {me.lastName} — {me.email}. Name and portal email
              changes go through an officer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={JSON.stringify([me.personalEmail, me.cellPhone, me.homePhone, me.localAddress, me.homeAddress])}
              action={updateProfile}
              className="space-y-3"
            >
              <label className="block text-sm">
                Personal email
                <input
                  name="personalEmail"
                  type="email"
                  defaultValue={me.personalEmail ?? ''}
                  className={FIELD}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Cell phone
                  <input
                    name="cellPhone"
                    defaultValue={me.cellPhone ?? ''}
                    className={FIELD}
                  />
                </label>
                <label className="block text-sm">
                  Home phone
                  <input
                    name="homePhone"
                    defaultValue={me.homePhone ?? ''}
                    className={FIELD}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Local address
                <input
                  name="localAddress"
                  defaultValue={me.localAddress ?? ''}
                  className={FIELD}
                />
              </label>
              <label className="block text-sm">
                Home address
                <input
                  name="homeAddress"
                  defaultValue={me.homeAddress ?? ''}
                  className={FIELD}
                />
              </label>
              <Button type="submit" size="sm">
                Save contact info
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Navigation layout</CardTitle>
            <CardDescription>
              Choose how the portal navigation is displayed for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form key={me.navLayout} action={updateNavLayout} className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="navLayout"
                  value="sidebar"
                  defaultChecked={me.navLayout !== 'topnav'}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Sidebar</span>
                  <span className="block text-muted-foreground">
                    Grouped sections in a collapsible left sidebar (default).
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="navLayout"
                  value="topnav"
                  defaultChecked={me.navLayout === 'topnav'}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Top navbar</span>
                  <span className="block text-muted-foreground">
                    Section dropdowns along the top of the page.
                  </span>
                </span>
              </label>
              <Button type="submit" size="sm">
                Save layout
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
