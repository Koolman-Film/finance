import {
  createBookingChannel,
  renameBookingChannel,
  toggleBookingChannelActive,
} from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

import { TaxonomyManager } from "../_components/TaxonomyManager";

export default async function BookingChannelsPage() {
  const channels = await prisma.bookingChannel.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, active: true },
  });

  return (
    <TaxonomyManager
      title="ช่องทางการจอง (จองผ่าน)"
      inputLabel="ชื่อช่องทางใหม่"
      items={channels}
      createAction={createBookingChannel}
      renameAction={renameBookingChannel}
      toggleActiveAction={toggleBookingChannelActive}
    />
  );
}
