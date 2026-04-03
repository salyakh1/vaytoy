import EditorClient from "./EditorClient";
import { createDemoInvite } from "@/lib/demoInvite";
import { mergeInviteWithDefaults } from "@/lib/inviteMerge";
import { prisma } from "@/lib/prisma";
import type { InviteDoc } from "@/lib/inviteTypes";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditInvitePage({ params }: Props) {
  const { id } = await params;
  const slug = /^\d+$/.test(id) ? `demo-${id}` : id;

  let initial: InviteDoc = createDemoInvite(slug);
  let initialPublished = false;

  if (process.env.DATABASE_URL) {
    try {
      const row = await prisma.invitation.findUnique({ where: { slug } });
      if (row) {
        initial = mergeInviteWithDefaults(slug, row.data as InviteDoc);
        initialPublished = row.published;
      }
    } catch {
      // БД недоступна — демо
    }
  }

  return <EditorClient initial={initial} initialPublished={initialPublished} />;
}
