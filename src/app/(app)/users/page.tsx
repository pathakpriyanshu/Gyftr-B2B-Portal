"use client";

import * as React from "react";
import { UserPlus, Users as UsersIcon, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/lib/client/hooks";
import { useSession, useHasRole } from "@/providers/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { api, ApiClientError } from "@/lib/client/api";
import { formatDate } from "@/lib/utils";
import type { AppUser, UserRole } from "@/types";

const ROLE_BADGE: Record<UserRole, { label: string; variant: "default" | "info" | "success" | "secondary" }> = {
  admin: { label: "Administrator", variant: "default" },
  finance: { label: "Finance", variant: "info" },
  procurement: { label: "Procurement", variant: "success" },
  viewer: { label: "Viewer", variant: "secondary" },
};

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const isAdmin = useHasRole("admin");
  const me = useSession();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = React.useState(false);

  const users = data?.users ?? [];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage who can access this account and what they can do."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Users" }]}
        actions={
          isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add User
            </Button>
          )
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-3 font-semibold">User</th>
                    <th className="px-2 py-3 font-semibold">Role</th>
                    <th className="px-2 py-3 font-semibold">Status</th>
                    <th className="px-2 py-3 font-semibold">Last Login</th>
                    {isAdmin && <th className="px-2 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <UserRow key={u.id} user={u} isAdmin={isAdmin} isSelf={u.id === me.id} qc={qc} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" /> One user belongs to exactly one client. Roles control
        access: Admins manage users, Finance verifies payments, Procurement places orders, Viewers
        have read-only access.
      </p>

      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} qc={qc} />
    </div>
  );
}

function UserRow({
  user,
  isAdmin,
  isSelf,
  qc,
}: {
  user: AppUser;
  isAdmin: boolean;
  isSelf: boolean;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [saving, setSaving] = React.useState(false);
  const badge = ROLE_BADGE[user.role];

  const update = async (patch: Partial<Pick<AppUser, "role" | "status">>) => {
    setSaving(true);
    try {
      await api.patch(`/api/users/${user.id}`, patch);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-2 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} />
          <div>
            <p className="font-semibold">
              {user.fullName} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-3.5">
        {isAdmin && !isSelf ? (
          <Select
            value={user.role}
            disabled={saving}
            onChange={(e) => update({ role: e.target.value as UserRole })}
            className="h-9 w-40"
          >
            <option value="admin">Administrator</option>
            <option value="finance">Finance</option>
            <option value="procurement">Procurement</option>
            <option value="viewer">Viewer</option>
          </Select>
        ) : (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        )}
      </td>
      <td className="px-2 py-3.5">
        {user.status === "active" ? (
          <Badge variant="success">Active</Badge>
        ) : user.status === "disabled" ? (
          <Badge variant="destructive">Disabled</Badge>
        ) : (
          <Badge variant="warning">Invited</Badge>
        )}
      </td>
      <td className="px-2 py-3.5 text-muted-foreground">
        {user.lastLoginAt ? formatDate(user.lastLoginAt, true) : "Never"}
      </td>
      {isAdmin && (
        <td className="px-2 py-3.5 text-right">
          {!isSelf &&
            (user.status === "active" ? (
              <Button variant="ghost" size="sm" loading={saving} onClick={() => update({ status: "disabled" })}>
                Disable
              </Button>
            ) : (
              <Button variant="ghost" size="sm" loading={saving} onClick={() => update({ status: "active" })}>
                Enable
              </Button>
            ))}
        </td>
      )}
    </tr>
  );
}

function AddUserDialog({
  open,
  onClose,
  qc,
}: {
  open: boolean;
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("procurement");
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("procurement");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/users", { fullName, email, phone: phone || null, role });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User added");
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not add user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add User" description="Invite a teammate to this account.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uemail">Work email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="uemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="admin">Administrator</option>
              <option value="finance">Finance</option>
              <option value="procurement">Procurement</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <UserPlus className="h-4 w-4" /> Add User
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
