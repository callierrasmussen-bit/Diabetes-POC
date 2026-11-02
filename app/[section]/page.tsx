import CarePlate from "@/components/CarePlate";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "welcome",
      "glucose",
      "blood-pressure",
      "meals",
      "recipe",
      "history",
      "shopping",
      "trends",
      "preferences",
      "caregiver",
      "notes",
      "settings",
      "day",
    ].includes(section)
  )
    notFound();
  return <CarePlate section={section} />;
}
