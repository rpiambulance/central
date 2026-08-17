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
import { updateNavLayout,
  updateTimeFormat, updateProfile } from './actions';

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
  timeFormat: '24h' | '12h';
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
              Everything below is yours to change, except your name and portal
              email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Shown as fields rather than prose so they read as part of the
                record, but disabled: only an officer can change them. */}
            <div className="mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  First name
                  <input
                    value={me.firstName}
                    readOnly
                    disabled
                    className={`${FIELD} cursor-not-allowed opacity-70`}
                  />
                </label>
                <label className="block text-sm">
                  Last name
                  <input
                    value={me.lastName}
                    readOnly
                    disabled
                    className={`${FIELD} cursor-not-allowed opacity-70`}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Portal email
                <input
                  value={me.email}
                  readOnly
                  disabled
                  className={`${FIELD} cursor-not-allowed opacity-70`}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Only an officer can change your name or portal email — ask one
                if either is wrong.
              </p>
            </div>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time format</CardTitle>
            <CardDescription>
              How times are shown to you across the site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              key={me.timeFormat}
              action={updateTimeFormat}
              className="space-y-3"
            >
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="timeFormat"
                  value="24h"
                  defaultChecked={me.timeFormat !== '12h'}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">24-hour</span>
                  <span className="block text-muted-foreground">
                    19:05 (default).
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="timeFormat"
                  value="12h"
                  defaultChecked={me.timeFormat === '12h'}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">12-hour</span>
                  <span className="block text-muted-foreground">
                    7:05 pm.
                  </span>
                </span>
              </label>
              <Button type="submit" size="sm">
                Save time format
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
