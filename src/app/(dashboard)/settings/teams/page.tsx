import { auth, type ExtendedSession } from "@/lib/auth";
import { getTeams } from "@/lib/actions/teams";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersRound, Plus, Building2 } from "lucide-react";

export default async function TeamsPage() {
  const session = (await auth()) as ExtendedSession | null;
  if (!session?.user) return null;

  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const teams = await getTeams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
            <UsersRound className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-500">Manage teams and member assignments</p>
          </div>
        </div>
        <Button className="gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white">
          <Plus className="h-4 w-4" />
          New Team
        </Button>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-0">
          {teams.length === 0 ? (
            <div className="py-12 text-center">
              <UsersRound className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No teams created yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 bg-gray-50/50">
                  <TableHead className="text-xs font-medium text-gray-500">Team</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Manager</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Office</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Members</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">{team.name}</p>
                      {team.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{team.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {team.manager.firstName} {team.manager.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gray-100 text-gray-700">
                        <Building2 className="mr-1 h-3 w-3" />
                        {team.office.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{team._count.members}</span>
                        <div className="flex -space-x-2">
                          {team.members.slice(0, 3).map((m) => (
                            <div
                              key={m.id}
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[9px] font-medium text-gray-600"
                              title={`${m.user.firstName} ${m.user.lastName}`}
                            >
                              {m.user.firstName[0]}{m.user.lastName[0]}
                            </div>
                          ))}
                          {team._count.members > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-300 text-[9px] font-medium text-gray-600">
                              +{team._count.members - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
