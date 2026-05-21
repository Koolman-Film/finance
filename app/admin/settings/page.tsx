import { prisma } from "@/lib/prisma";

import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const setting = await prisma.setting.findUnique({
    where: { key: "staff_can_edit_others_in_branch" },
  });
  const staffCanEdit = setting?.value !== "false"; // default true

  return <SettingsForm staffCanEdit={staffCanEdit} />;
}
