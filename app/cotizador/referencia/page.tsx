import { notFound } from "next/navigation";
import { referenceEnabled } from "@/lib/courier/catalog";
import CourierForm from "../courier-form";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!referenceEnabled()) notFound();
  return <CourierForm reference />;
}
