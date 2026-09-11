const mainSite = "https://globaltriplog.com";

export default function GlobalTripHeader() {
  const links = [
    { label: "Inicio", href: mainSite },
    { label: "Servicios", href: `${mainSite}/#servicios-bloque` },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-50 bg-white px-6 py-2 shadow-sm md:px-12">
      <a href="#cotizador" className="sr-only z-50 rounded-xl bg-white p-4 font-bold focus:not-sr-only focus:absolute">Ir al cotizador</a>
      <div className="flex items-center justify-between gap-4">
        <a href={mainSite} aria-label="GlobalTrip, ir al inicio" className="shrink-0">
          <img src="/brand/globaltrip.png" alt="Global Trip Logo" className="block h-20 w-auto object-contain md:h-24" decoding="async" />
        </a>
        <div className="flex items-center gap-6">
          <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
            {links.map(link => <a key={link.label} href={link.href} className="text-[15px] font-bold text-slate-600 transition-colors hover:text-[#0b0c49]">{link.label}</a>)}
            <span aria-current="page" className="text-[15px] font-extrabold text-[#0b0c49]">Cotizador</span>
          </nav>
          <a href={`${mainSite}/contacto`} className="hidden rounded-xl bg-[#0b0c49] px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#161865] md:inline-flex">Contacto</a>
          <details className="group md:hidden">
            <summary aria-label="Menú de navegación" className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 text-slate-700 [&::-webkit-details-marker]:hidden">
              <svg className="h-5 w-5 group-open:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              <svg className="hidden h-5 w-5 group-open:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
            </summary>
            <nav aria-label="Navegación móvil" className="absolute left-6 right-6 top-full mt-2 flex flex-col gap-1 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-xl">
              {links.map(link => <a key={link.label} href={link.href} className="rounded-xl px-3 py-4 text-xs font-extrabold uppercase tracking-[.14em] text-slate-600 hover:bg-slate-50">{link.label}</a>)}
              <span aria-current="page" className="rounded-xl bg-slate-50 px-3 py-4 text-xs font-extrabold uppercase tracking-[.14em] text-[#0b0c49]">Cotizador</span>
              <a href={`${mainSite}/contacto`} className="mt-3 rounded-xl bg-[#0b0c49] px-6 py-4 text-center text-sm font-bold text-white hover:bg-[#161865]">Contacto</a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
