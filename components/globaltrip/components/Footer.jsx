"use client";
import { Link } from '../routing';
import { useLanguage } from '../context/useLanguage';
import { trackEvent } from '../lib/gtm';
import NewsletterSignup from './NewsletterSignup';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer data-globaltrip-chrome="" className="bg-slate-50 pt-20 pb-12 px-6 md:px-12 border-t border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.15fr_0.7fr_0.9fr_1fr] mb-20">

                    <div className="flex flex-col gap-6">
                        <div className="text-[#0b0c49] text-2xl font-black tracking-tighter">
                            Global Trip
                        </div>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">
                            {t('footer.description')}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <a href="https://www.linkedin.com/company/globaltriplog/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#0077b5] hover:border-[#0077b5] transition-colors">
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                            </a>
                            <a href="https://www.tiktok.com/@germanjimenez.ok" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-black hover:border-black transition-colors">
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                            </a>
                            <a href="https://www.instagram.com/globaltrip_comex/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#e1306c] hover:border-[#e1306c] transition-colors">
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </a>
                            <a
                                href="https://api.whatsapp.com/send/?phone=5491131411755&text=Hola%21+vengo+de+la+web+y+me+gustar%C3%ADa+realizar+una+consulta.&type=phone_number&app_absent=0"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackEvent('whatsapp_click', {
                                    location: 'footer_social',
                                    label: 'social_whatsapp'
                                })}
                                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#25D366] hover:border-[#25D366] transition-colors"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="text-[12px] font-black text-slate-900 tracking-widest uppercase">{t('footer.usefulLinks')}</h4>
                        <nav className="flex flex-col gap-4">
                            <Link to="/trabaja-con-nosotros" className="text-slate-500 text-[14px] font-semibold hover:text-primary">{t('nav.about')}</Link>
                            <Link to="/servicios" className="text-slate-500 text-[14px] font-semibold hover:text-primary">{t('nav.services')}</Link>
                            <Link to="/noticias" className="text-slate-500 text-[14px] font-semibold hover:text-primary">{t('nav.news')}</Link>
                            <Link to="/alta-cliente" className="text-slate-500 text-[14px] font-semibold hover:text-primary">{t('nav.registration')}</Link>
                            <Link to="/contacto" className="text-slate-500 text-[14px] font-semibold hover:text-primary">{t('nav.contact')}</Link>
                        </nav>
                    </div>

                    <div className="flex flex-col gap-6">
                        <h4 className="text-[12px] font-black text-slate-900 tracking-widest uppercase">{t('footer.quickContact')}</h4>
                        <div className="flex flex-col gap-4">
                            <a
                                href="mailto:info@globaltriplog.com"
                                onClick={() => trackEvent('click_email', {
                                    location: 'footer_quick_contact',
                                    label: 'quick_contact_email'
                                })}
                                className="text-slate-500 text-[14px] font-semibold hover:text-primary transition-colors"
                            >
                                info@globaltriplog.com
                            </a>
                            <a
                                href="https://wa.me/5491131411755"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackEvent('whatsapp_click', {
                                    location: 'footer_quick_contact',
                                    label: 'quick_contact_whatsapp'
                                })}
                                className="text-slate-500 text-[14px] font-semibold hover:text-primary transition-colors"
                            >
                                WhatsApp: (+54 9 11) 3141-1755
                            </a>
                            <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                                Maipú 231 - 5th floor - Office B, C.A.B.A.
                            </p>
                        </div>
                    </div>

                    <NewsletterSignup
                        source="footer_newsletter"
                        title={t('footer.subscription.title')}
                        description={t('footer.subscription.description')}
                        className="flex flex-col gap-6"
                    />
                </div>

                <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center text-[10px] md:text-[11px] font-black uppercase tracking-[0.34em] text-slate-400 md:text-left w-full">
                        {t('footer.copyright')}
                    </div>
                    <div className="w-full md:flex md:justify-end md:pr-20 lg:pr-24">
                        <a
                            href="https://www.nexopstech.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 transition-transform duration-200 hover:scale-[1.02] sm:gap-3"
                            aria-label={t('footer.poweredBy')}
                        >
                            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 sm:text-[11px] sm:tracking-[0.32em]">
                                {t('footer.poweredBy')}
                            </span>
                            <img
                                src="/logo-powered-globaltrip.png"
                                alt="NexOps"
                                className="h-6 w-auto object-contain"
                                loading="lazy"
                                decoding="async"
                            />
                            <span className="text-[14px] font-black tracking-tight text-slate-900">
                                NexOps
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
