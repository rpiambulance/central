import { formatCredKey } from '@/lib/format';
import { api, ApiError } from '@/lib/api';
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
  credentials: Array<{
    title: string | null;
    type: { key: string; name: string };
  }>;
};

export default async function MembersPage() {
  let members: Member[];
  try {
    members = await api<Member[]>('/v1/members');
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
        description={`${members.length} active members.`}
      />
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
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.credentials.map((cred, i) => (
                      <Badge
                        key={`${formatCredKey(cred.type.key)}-${i}`}
                        variant="secondary"
                        title={cred.title ?? cred.type.name}
                      >
                        {formatCredKey(cred.type.key)}
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
