"use client";
import { useEffect, useState } from 'react';
import { Link, useLocation } from '../routing';
import { useLanguage } from '../context/useLanguage';

const Header = () => {
    const { language, setLanguage, t } = useLanguage();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const languages = [
        { code: 'es', flag: 'https://flagcdn.com/w40/ar.png', alt: 'Español' },
        { code: 'en', flag: 'https://flagcdn.com/w40/us.png', alt: 'English' },
        { code: 'pt', flag: 'https://flagcdn.com/w40/br.png', alt: 'Português' }
    ];

    const scrollToServices = (e) => {
        if (window.location.pathname === '/') {
            e.preventDefault();
            const element = document.getElementById('servicios-bloque');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }

        setIsMobileMenuOpen(false);
    };

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    return (
        <header data-globaltrip-chrome="" className="sticky top-0 z-[100] border-b border-slate-50 bg-white px-6 py-2 shadow-sm md:px-12">
            <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center" onClick={() => window.scrollTo(0, 0)}>
                    <img
                        src="/logogt.png"
                        alt="Global Trip Logo"
                        className="h-20 w-auto object-contain block md:h-24"
                        decoding="async"
                    />
                </Link>

                <div className="flex items-center gap-3 md:gap-6">
                    <nav className="hidden xl:flex items-center gap-8 whitespace-nowrap">
                        <Link className="text-[15px] font-bold text-slate-600 transition-colors hover:text-primary" to="/">
                            {t('nav.home')}
                        </Link>
                        <Link className="text-[15px] font-bold text-slate-600 transition-colors hover:text-primary" to="/trabaja-con-nosotros">
                            {t('nav.about')}
                        </Link>
                        <a className="cursor-pointer text-[15px] font-bold text-slate-600 transition-colors hover:text-primary" onClick={scrollToServices} href="https://globaltriplog.com/#servicios-bloque">
                            {t('nav.services')}
                        </a>
                        <Link className="text-[15px] font-bold text-slate-600 transition-colors hover:text-primary" to="/noticias">
                            {t('nav.news')}
                        </Link>
                        <Link className="text-[15px] font-bold text-slate-600 transition-colors hover:text-primary" to="/alta-cliente" aria-current={location.pathname === '/alta-cliente' ? 'page' : undefined}>
                            {t('nav.registration')}
                        </Link>
                    </nav>

                    <div className="hidden items-center gap-4 border-x border-slate-100 px-4 xl:flex xl:mx-2">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                style={{ cursor: 'pointer' }}
                                className={`h-5 w-7 overflow-hidden rounded-sm transition-all duration-300 transform hover:scale-125 ${language === lang.code ? 'scale-110 opacity-100 ring-2 ring-[#0b0c49] ring-offset-2' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                                    }`}
                            >
                                <img
                                    src={lang.flag}
                                    alt={lang.alt}
                                    className="pointer-events-none h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        ))}
                    </div>

                    <Link to="/contacto" className="hidden rounded-xl bg-[#0b0c49] px-8 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#161865] sm:inline-block">
                        {t('nav.contact')}
                    </Link>

                    <button
                        type="button"
                        aria-expanded={isMobileMenuOpen}
                        aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                        onClick={() => setIsMobileMenuOpen((current) => !current)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition-colors hover:border-[#0b0c49] hover:text-[#0b0c49] xl:hidden"
                    >
                        <span className="sr-only">{isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}</span>
                        <div className="flex flex-col gap-1.5">
                            <span className={`block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${isMobileMenuOpen ? 'translate-y-2 rotate-45' : ''}`} />
                            <span className={`block h-0.5 w-5 rounded-full bg-current transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                            <span className={`block h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${isMobileMenuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
                        </div>
                    </button>
                </div>
            </div>

            {isMobileMenuOpen ? (
                <div className="mt-4 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.45)] xl:hidden">
                    <nav className="flex flex-col gap-2">
                        <Link
                            className="rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0b0c49]"
                            to="/"
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                window.scrollTo(0, 0);
                            }}
                        >
                            {t('nav.home')}
                        </Link>
                        <a
                            className="rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0b0c49]"
                            onClick={scrollToServices}
                            href="https://globaltriplog.com/#servicios-bloque"
                        >
                            {t('nav.services')}
                        </a>
                        <Link
                            className="rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0b0c49]"
                            to="/trabaja-con-nosotros"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t('nav.about')}
                        </Link>
                        <Link
                            className="rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0b0c49]"
                            to="/noticias"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t('nav.news')}
                        </Link>
                        <Link
                            className="rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#0b0c49]"
                            to="/alta-cliente"
                            aria-current={location.pathname === '/alta-cliente' ? 'page' : undefined}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t('nav.registration')}
                        </Link>
                        <Link
                            className="rounded-2xl bg-[#0b0c49] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#161865]"
                            to="/contacto"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {t('nav.contact')}
                        </Link>
                    </nav>

                    <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                style={{ cursor: 'pointer' }}
                                className={`h-6 w-9 overflow-hidden rounded-md transition-all duration-300 ${language === lang.code ? 'scale-105 opacity-100 ring-2 ring-[#0b0c49] ring-offset-2' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                                    }`}
                            >
                                <img
                                    src={lang.flag}
                                    alt={lang.alt}
                                    className="pointer-events-none h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            ) : null}
        </header>
    );
};

export default Header;
