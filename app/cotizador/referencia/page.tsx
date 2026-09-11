import { notFound } from "next/navigation";
import { referenceEnabled } from "@/lib/courier/catalog";
import CourierForm from "../reference-form";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!referenceEnabled()) notFound();
  return <CourierForm reference />;
}
