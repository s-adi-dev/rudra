import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building,
  Plus,
  RotateCcw,
  Save,
  Target,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// TypeScript interfaces
interface UserType {
  username: string;
  firstName: string;
  lastName: string;
}

interface MemberType {
  username: string;
  target: number;
}

interface TeamType {
  id: string;
  name: string;
  monthId: string;
  leader: MemberType;
  members: MemberType[];
}

interface MonthlyTargetType {
  monthId: string;
  teams: TeamType[];
  directMembers: MemberType[];
}

interface NewTeamType {
  name: string;
  leader: MemberType;
  members: MemberType[];
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed (0-11)
  const year = now.getFullYear();
  return `${month}-${year}`;
}

export default function TargetForm() {
  // Sample users database
  const allUsers: UserType[] = useMemo(
    () => [
      { username: "john_doe", firstName: "John", lastName: "Doe" },
      { username: "jane_smith", firstName: "Jane", lastName: "Smith" },
      { username: "bob_wilson", firstName: "Bob", lastName: "Wilson" },
      { username: "alice_brown", firstName: "Alice", lastName: "Brown" },
      { username: "charlie_davis", firstName: "Charlie", lastName: "Davis" },
      { username: "diana_miller", firstName: "Diana", lastName: "Miller" },
      { username: "edward_jones", firstName: "Edward", lastName: "Jones" },
      { username: "fiona_garcia", firstName: "Fiona", lastName: "Garcia" },
      {
        username: "george_martinez",
        firstName: "George",
        lastName: "Martinez",
      },
      {
        username: "helen_rodriguez",
        firstName: "Helen",
        lastName: "Rodriguez",
      },
    ],
    [],
  );

  const [monthlyTarget, setMonthlyTarget] = useState<MonthlyTargetType>({
    monthId: getCurrentMonth(),
    teams: [],
    directMembers: [],
  });

  const [newTeam, setNewTeam] = useState<NewTeamType>({
    name: "",
    leader: { username: "", target: 0 },
    members: [],
  });

  const [newDirectMember, setNewDirectMember] = useState<MemberType>({
    username: "",
    target: 0,
  });

  const [newTeamMember, setNewTeamMember] = useState<MemberType>({
    username: "",
    target: 0,
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Get assigned users (users who are already in teams or direct members)
  const getAssignedUsers = useMemo((): Set<string> => {
    const assigned = new Set<string>();

    // Add team leaders
    monthlyTarget.teams.forEach((team) => {
      assigned.add(team.leader.username);
    });

    // Add team members
    monthlyTarget.teams.forEach((team) => {
      team.members.forEach((member) => {
        assigned.add(member.username);
      });
    });

    // Add direct members
    monthlyTarget.directMembers.forEach((member) => {
      assigned.add(member.username);
    });

    return assigned;
  }, [monthlyTarget]);

  // Get available users (not yet assigned)
  const availableUsers = useMemo((): UserType[] => {
    return allUsers.filter((user) => !getAssignedUsers.has(user.username));
  }, [allUsers, getAssignedUsers]);

  // Get user display name
  const getUserDisplayName = useCallback(
    (username: string): string => {
      const user = allUsers.find((u) => u.username === username);
      return user ? `${user.firstName} ${user.lastName}` : username;
    },
    [allUsers],
  );

  const addTeam = useCallback(() => {
    if (newTeam.name && newTeam.leader.username) {
      const team: TeamType = {
        id: `team-${Date.now()}`,
        name: newTeam.name,
        monthId: monthlyTarget.monthId,
        leader: newTeam.leader,
        members: newTeam.members,
      };

      setMonthlyTarget((prev) => ({
        ...prev,
        teams: [...prev.teams, team],
      }));

      setNewTeam({
        name: "",
        leader: { username: "", target: 0 },
        members: [],
      });
    }
  }, [newTeam, monthlyTarget.monthId]);

  const addDirectMember = useCallback(() => {
    if (newDirectMember.username) {
      setMonthlyTarget((prev) => ({
        ...prev,
        directMembers: [...prev.directMembers, newDirectMember],
      }));

      setNewDirectMember({ username: "", target: 0 });
    }
  }, [newDirectMember]);

  const addTeamMember = useCallback(() => {
    if (newTeamMember.username && selectedTeamId) {
      setMonthlyTarget((prev) => ({
        ...prev,
        teams: prev.teams.map((team) =>
          team.id === selectedTeamId
            ? { ...team, members: [...team.members, newTeamMember] }
            : team,
        ),
      }));

      setNewTeamMember({ username: "", target: 0 });
      setSelectedTeamId("");
    }
  }, [newTeamMember, selectedTeamId]);

  const removeTeam = useCallback((teamId: string) => {
    setMonthlyTarget((prev) => ({
      ...prev,
      teams: prev.teams.filter((team) => team.id !== teamId),
    }));
  }, []);

  const removeDirectMember = useCallback((username: string) => {
    setMonthlyTarget((prev) => ({
      ...prev,
      directMembers: prev.directMembers.filter(
        (member) => member.username !== username,
      ),
    }));
  }, []);

  const removeTeamMember = useCallback((teamId: string, username: string) => {
    setMonthlyTarget((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              members: team.members.filter(
                (member) => member.username !== username,
              ),
            }
          : team,
      ),
    }));
  }, []);

  const updateMemberTarget = useCallback(
    (
      type: "direct" | "team-leader" | "team-member",
      identifier: string | null,
      username: string,
      newTarget: number,
    ) => {
      if (type === "direct") {
        setMonthlyTarget((prev) => ({
          ...prev,
          directMembers: prev.directMembers.map((member) =>
            member.username === username
              ? { ...member, target: newTarget }
              : member,
          ),
        }));
      } else if (type === "team-leader" && identifier) {
        setMonthlyTarget((prev) => ({
          ...prev,
          teams: prev.teams.map((team) =>
            team.id === identifier
              ? { ...team, leader: { ...team.leader, target: newTarget } }
              : team,
          ),
        }));
      } else if (type === "team-member" && identifier) {
        setMonthlyTarget((prev) => ({
          ...prev,
          teams: prev.teams.map((team) =>
            team.id === identifier
              ? {
                  ...team,
                  members: team.members.map((member) =>
                    member.username === username
                      ? { ...member, target: newTarget }
                      : member,
                  ),
                }
              : team,
          ),
        }));
      }
    },
    [],
  );

  const getTotalTarget = useCallback((): number => {
    const directTotal = monthlyTarget.directMembers.reduce(
      (sum, member) => sum + member.target,
      0,
    );
    const teamsTotal = monthlyTarget.teams.reduce((sum, team) => {
      const teamTotal =
        team.leader.target +
        team.members.reduce(
          (memberSum, member) => memberSum + member.target,
          0,
        );
      return sum + teamTotal;
    }, 0);
    return directTotal + teamsTotal;
  }, [monthlyTarget]);

  const resetForm = useCallback(() => {
    setMonthlyTarget({
      monthId: "04-2025",
      teams: [],
      directMembers: [],
    });
    setNewTeam({
      name: "",
      leader: { username: "", target: 0 },
      members: [],
    });
    setNewDirectMember({ username: "", target: 0 });
    setNewTeamMember({ username: "", target: 0 });
    setSelectedTeamId("");
  }, []);

  const handleSave = useCallback(() => {
    // Here you would typically save to your backend
    console.log("Saving targets:", monthlyTarget);
    alert("Targets saved successfully!");
  }, [monthlyTarget]);

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg">
        {/* <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950"> */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Target className="h-6 w-6 text-blue-600" />
            Monthly Target Management
          </CardTitle>
          <CardDescription className="text-base">
            Assign monthly booking targets to employees and teams for{" "}
            <span className="font-semibold">{monthlyTarget.monthId}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Available Users</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {availableUsers.length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Assigned Users</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {getAssignedUsers.size}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Total Target</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {getTotalTarget()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Teams Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Teams</h2>
              <Badge variant="secondary" className="px-2 py-0.5">
                {monthlyTarget.teams.length}
              </Badge>
            </div>

            {/* Existing Teams */}
            <div className="grid gap-4">
              {monthlyTarget.teams.map((team) => (
                <Card
                  key={team.id}
                  className=" shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTeam(team.id)}
                        className="text-red-600 hover:text-red-700 self-start sm:self-center"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove team</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Team Leader */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          Leader: {getUserDisplayName(team.leader.username)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`leader-${team.id}`}
                          className="text-sm"
                        >
                          Target:
                        </Label>
                        <Input
                          id={`leader-${team.id}`}
                          type="number"
                          value={team.leader.target}
                          onChange={(e) =>
                            updateMemberTarget(
                              "team-leader",
                              team.id,
                              team.leader.username,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-20"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div
                          key={member.username}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/50 border rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Users className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">
                              {getUserDisplayName(member.username)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Target:</Label>
                            <Input
                              type="number"
                              value={member.target}
                              onChange={(e) =>
                                updateMemberTarget(
                                  "team-member",
                                  team.id,
                                  member.username,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-20"
                              min="0"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                removeTeamMember(team.id, member.username)
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove member</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Team Member */}
                    {availableUsers.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-dashed">
                        <Select
                          value={
                            selectedTeamId === team.id
                              ? newTeamMember.username
                              : ""
                          }
                          onValueChange={(value) => {
                            setSelectedTeamId(team.id);
                            setNewTeamMember((prev) => ({
                              ...prev,
                              username: value,
                            }));
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Add team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers.map((user) => (
                              <SelectItem
                                key={user.username}
                                value={user.username}
                              >
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Target"
                          value={
                            selectedTeamId === team.id
                              ? newTeamMember.target || ""
                              : ""
                          }
                          onChange={(e) => {
                            setSelectedTeamId(team.id);
                            setNewTeamMember((prev) => ({
                              ...prev,
                              target: parseInt(e.target.value) || 0,
                            }));
                          }}
                          className="w-full sm:w-24"
                          min="0"
                        />
                        <Button
                          onClick={addTeamMember}
                          size="sm"
                          disabled={
                            selectedTeamId !== team.id ||
                            !newTeamMember.username
                          }
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add New Team */}
            {availableUsers.length > 0 && (
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input
                        id="team-name"
                        placeholder="Enter team name"
                        value={newTeam.name}
                        onChange={(e) =>
                          setNewTeam((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team-leader">Team Leader</Label>
                      <Select
                        value={newTeam.leader.username}
                        onValueChange={(value) =>
                          setNewTeam((prev) => ({
                            ...prev,
                            leader: { ...prev.leader, username: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team leader" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem
                              key={user.username}
                              value={user.username}
                            >
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 w-full space-y-2">
                      <Label htmlFor="leader-target">Leader Target</Label>
                      <Input
                        id="leader-target"
                        type="number"
                        placeholder="0"
                        value={newTeam.leader.target || ""}
                        onChange={(e) =>
                          setNewTeam((prev) => ({
                            ...prev,
                            leader: {
                              ...prev.leader,
                              target: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        min="0"
                      />
                    </div>
                    <Button
                      onClick={addTeam}
                      disabled={!newTeam.name || !newTeam.leader.username}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Team
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Direct Members Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Direct Members</h2>
              <Badge variant="secondary" className="px-2 py-0.5">
                {monthlyTarget.directMembers.length}
              </Badge>
            </div>

            {/* Existing Direct Members */}
            <div className="grid gap-3">
              {monthlyTarget.directMembers.map((member) => (
                <div
                  key={member.username}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {getUserDisplayName(member.username)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Target:</Label>
                    <Input
                      type="number"
                      value={member.target}
                      onChange={(e) =>
                        updateMemberTarget(
                          "direct",
                          null,
                          member.username,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-20"
                      min="0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDirectMember(member.username)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove member</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Direct Member */}
            {availableUsers.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                <Select
                  value={newDirectMember.username}
                  onValueChange={(value) =>
                    setNewDirectMember((prev) => ({ ...prev, username: value }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select direct member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.username} value={user.username}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Target"
                  value={newDirectMember.target || ""}
                  onChange={(e) =>
                    setNewDirectMember((prev) => ({
                      ...prev,
                      target: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full sm:w-24"
                  min="0"
                />
                <Button
                  onClick={addDirectMember}
                  disabled={!newDirectMember.username}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:justify-end sm:flex-row gap-3 pt-6 border-t">
            <Button onClick={resetForm} variant="outline" size="default">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Form
            </Button>
            <Button onClick={handleSave} size="default">
              <Save className="h-4 w-4 mr-2" />
              Save Targets
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
