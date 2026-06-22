"use client";

import { User, Building2, Shield, Mail, BadgeCheck } from "lucide-react";
import { useSession } from "@/providers/session";
import { useCheckoutConfig } from "@/lib/client/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  finance: "Finance",
  procurement: "Procurement",
  viewer: "Viewer",
};

export default function SettingsPage() {
  const user = useSession();
  const { data: config } = useCheckoutConfig();

  return (
    <div>
      <PageHeader
        title="Account Settings"
        description="Your profile and organisation details."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-primary" /> Your Profile
            </h2>
            <div className="flex items-center gap-4">
              <Avatar name={user.fullName} className="h-14 w-14 text-lg" />
              <div>
                <p className="text-lg font-semibold">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <Field icon={Mail} label="Email" value={user.email} />
              <Field
                icon={BadgeCheck}
                label="Role"
                value={<Badge variant="default">{ROLE_LABEL[user.role]}</Badge>}
              />
            </dl>
            <p className="mt-5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              To update your name or role, contact your account administrator.
            </p>
          </CardContent>
        </Card>

        {/* Organisation */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <Building2 className="h-4 w-4 text-primary" /> Organisation
            </h2>
            <dl className="space-y-3 text-sm">
              <Field icon={Building2} label="Company" value={user.clientName} />
              {config?.client?.gstNumber && (
                <Field icon={Shield} label="GST Number" value={config.client.gstNumber} />
              )}
              <Field
                icon={BadgeCheck}
                label="Payment Methods"
                value={
                  <div className="flex gap-1.5">
                    {config?.paymentMethods.wallet && <Badge variant="success">Wallet</Badge>}
                    {config?.paymentMethods.bankTransfer && <Badge variant="info">Bank Transfer</Badge>}
                  </div>
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
