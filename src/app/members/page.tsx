import { summarizeCredentials } from '@/lib/credentials';
import { api, ApiError } from '@/lib/api';
import { myPermissions, VIEW_INACTIVE } from '@/lib/me';
import { InactiveToggle } from '@/components/inactive-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  active: boolean;
  nineHundredNumber: string | null;
  credentials: Array<{
    title: string | null;
    type: { key: string; name: string };
  }>;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ showInactive?: string }>;
}) {
  const { showInactive } = await searchParams;
  const permissions = await myPermissions();
  const maySeeInactive = permissions.has(VIEW_INACTIVE);
  const showingInactive = maySeeInactive && showInactive === '1';

  let members: Member[];
  try {
    members = await api<Member[]>(
      `/v1/members${showingInactive ? '?includeInactive=true' : ''}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <Card className="mx-auto mt-12 max-w-md">
          <CardHeader>
            <CardTitle>You don&apos;t have access</CardTitle>
            <CardDescription>
              The member roster requires additional permissions. If you think
              you should have access, contact an officer.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={
          showingInactive
            ? `${members.length} members, including inactive.`
            : `${members.length} active members.`
        }
      />
      {maySeeInactive ? (
        <InactiveToggle basePath="/members" showingInactive={showingInactive} />
      ) : null}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Credentials</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {member.lastName}, {member.firstName}
                  {member.nineHundredNumber ? (
                    <small className="ml-[5px] text-muted-foreground">
                      {member.nineHundredNumber}
                    </small>
                  ) : null}
                  {member.active ? null : (
                    <Badge variant="outline" className="ml-2 text-muted-foreground">
                      inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {summarizeCredentials(member.credentials).map((badge) => (
                      <Badge
                        key={badge.key}
                        variant="secondary"
                        title={badge.tooltip}
                      >
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <a
                    href={`mailto:${member.email}`}
                    className="hover:underline"
                  >
                    {member.email}
                  </a>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {member.cellPhone ?? (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
