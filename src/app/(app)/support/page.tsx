"use client";

import { Mail, Phone, MessageCircle, BookOpen, LifeBuoy, ChevronDown } from "lucide-react";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

const FAQS = [
  {
    q: "How long does payment verification take?",
    a: "Wallet payments are confirmed instantly. Bank transfers are typically verified by our finance team within a few business hours after you submit the UTR / payment proof.",
  },
  {
    q: "How do I download my vouchers?",
    a: "Once your payment is verified, you'll receive an email with a secure link. Open it, verify the OTP sent to your email, and download the vouchers as an Excel (.xlsx) file containing codes and PINs.",
  },
  {
    q: "Can I add more users to my account?",
    a: "Yes. Administrators can invite teammates from the Users page and assign roles (Finance, Procurement, Viewer).",
  },
  {
    q: "Why is a denomination or brand unavailable?",
    a: "Brand availability and denominations are configured per client rate card. Contact your account manager to enable additional brands.",
  },
];

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        title="Support & Help"
        description="We're here to help you get the most out of the portal."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Support" }]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ContactCard
          icon={Mail}
          title="Email us"
          value="b2b-support@gyftr.net"
          href="mailto:b2b-support@gyftr.net"
        />
        <ContactCard icon={Phone} title="Call us" value="1800-123-4567" href="tel:18001234567" />
        <ContactCard icon={MessageCircle} title="Live chat" value="Mon–Sat, 9am–7pm" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-primary" /> Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => (
            <Faq key={i} {...f} />
          ))}
        </div>
      </div>

      <Card className="mt-6 bg-brand-mesh text-white">
        <CardContent className="flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-brand-300" />
            <div>
              <p className="font-semibold">Still need help?</p>
              <p className="text-sm text-white/70">Our team responds within one business hour.</p>
            </div>
          </div>
          <a
            href="mailto:b2b-support@gyftr.net"
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-white/90"
          >
            Contact Support
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <Card className="h-full transition-all hover:border-primary/30 hover:card-shadow-lg">
      <CardContent className="flex items-center gap-3 pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="font-medium">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p>}
    </Card>
  );
}
