import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InviteDoc } from "@/lib/inviteTypes";
import { mergeInviteWithDefaults } from "@/lib/inviteMerge";
import { decodeInviteDocParam } from "@/lib/inviteParam";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ d?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  if (sp?.d) {
    return { title: "Предпросмотр · vaytoy" };
  }
  if (!process.env.DATABASE_URL) {
    return { title: "vaytoy" };
  }
  try {
    const row = await prisma.invitation.findUnique({
      where: { slug },
      select: { title: true, published: true },
    });
    if (!row?.published) {
      return { title: "vaytoy" };
    }
    const t = row.title?.trim();
    return { title: t ? `${t} · vaytoy` : "Приглашение · vaytoy" };
  } catch {
    return { title: "vaytoy" };
  }
}

export default async function PublicInvitePage(props: Props) {
  const { slug } = await props.params;
  const sp = await props.searchParams;

  if (sp.d) {
    const preview = decodeInviteDocParam(sp.d);
    if (preview) {
      const PublicInviteClient = (await import("./PublicInviteClient")).default;
      const doc = mergeInviteWithDefaults(slug, preview);
      return <PublicInviteClient fallback={doc} />;
    }
  }

  if (!process.env.DATABASE_URL) notFound();

  try {
    const row = await prisma.invitation.findUnique({ where: { slug } });
    if (!row?.published) notFound();
    const PublicInviteClient = (await import("./PublicInviteClient")).default;
    const doc = mergeInviteWithDefaults(slug, row.data as InviteDoc);
    return <PublicInviteClient fallback={doc} />;
  } catch {
    notFound();
  }
}
