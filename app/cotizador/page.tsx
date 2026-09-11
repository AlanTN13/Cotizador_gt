import CourierForm from "./courier-form";
import localFont from "next/font/local";
import GlobalTripHeader from "@/components/globaltrip/components/Header";
import GlobalTripFooter from "@/components/globaltrip/components/Footer";

import { LanguageProvider } from "@/components/globaltrip/context/LanguageContext";
import styles from "./globaltrip.module.css";
import "@/components/globaltrip/styles/fonts.css";
import "@/components/globaltrip/styles/chrome.css";

const manrope = localFont({
  src: [
    { path: "../../public/brand/manrope-400.ttf", weight: "400" },
    { path: "../../public/brand/manrope-500.ttf", weight: "500" },
    { path: "../../public/brand/manrope-600.ttf", weight: "600" },
    { path: "../../public/brand/manrope-700.ttf", weight: "700" },
    { path: "../../public/brand/manrope-800.ttf", weight: "800" },
  ],
  display: "swap",
});
export const metadata = {
  title: "Courier aéreo | GlobalTrip",
  description: "Cotizá tu importación comercial desde China a Buenos Aires.",
};
export default function Page() {
  return (
    <div className={`${manrope.className} ${styles.site} min-h-screen bg-white text-slate-900 [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#0b0c49] [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#0b0c49]`}>
      <LanguageProvider>
      <div className={styles.headerBoundary}>
        <GlobalTripHeader />
      </div>
      <CourierForm />
      <GlobalTripFooter />
      </LanguageProvider>
    </div>
  );
}
