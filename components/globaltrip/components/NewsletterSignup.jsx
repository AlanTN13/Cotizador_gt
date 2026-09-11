"use client";
import { useState } from 'react';
import { useLanguage } from '../context/useLanguage';
import { trackEvent } from '../lib/gtm';

const NewsletterSignup = ({
  source = 'newsletter',
  variant = 'footer',
  title,
  description,
  className = '',
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const newsletterWebhookUrl = process.env.NEXT_PUBLIC_GLOBALTRIP_NEWSLETTER_URL;

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    setSuccess('');
    setError('');

    if (!isValidEmail(normalizedEmail)) {
      setError(t('footer.subscription.errorInvalid'));
      return;
    }

    if (!newsletterWebhookUrl) {
      setError(t('footer.subscription.errorMissingConfig'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(newsletterWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify({
          type: 'newsletter',
          email: normalizedEmail,
        }),
      });

      const responseText = await response.text();
      let payload = {};

      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = { ok: response.ok };
        }
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || 'request_failed');
      }

      setEmail('');
      trackEvent('newsletter_submit_success', {
        location: source,
        label: 'newsletter_form',
      });
      setSuccess(t('footer.subscription.success'));
    } catch (submitError) {
      console.error('Newsletter subscription failed', submitError);
      setError(t('footer.subscription.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {title ? (
        <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-900">
          {title}
        </h4>
      ) : null}
      {description ? (
        <p className="text-[14px] font-medium leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      <form className="relative" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (success) setSuccess('');
            if (error) setError('');
          }}
          placeholder={t('footer.subscription.placeholder')}
          className={`w-full rounded-xl border bg-white text-sm font-medium text-slate-900 placeholder:text-slate-300 transition-all focus:border-primary focus:outline-none ${
            variant === 'hero'
              ? 'h-14 border-slate-200 pl-5 pr-14 shadow-sm'
              : 'h-12 border-slate-200 pl-4 pr-12'
          } ${error ? 'border-red-300' : ''}`}
          aria-label={t('footer.subscription.placeholder')}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={`absolute right-1 top-1 flex items-center justify-center rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
            variant === 'hero'
              ? 'h-12 w-12 bg-[#0b0c49] hover:bg-[#161865]'
              : 'h-10 w-10 bg-[#0b0c49] hover:bg-[#161865]'
          }`}
          aria-label={loading ? t('footer.subscription.submitting') : t('footer.subscription.button')}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          ) : (
            <span className="material-symbols-outlined !text-[18px]">send</span>
          )}
        </button>
      </form>
      <div className="min-h-[20px]">
        {loading ? (
          <p className="text-[13px] font-semibold text-slate-500">
            {t('footer.subscription.pending')}
          </p>
        ) : null}
        {success ? (
          <p className="text-[13px] font-semibold text-emerald-600">
            {success}
          </p>
        ) : null}
        {error ? (
          <p className="text-[13px] font-semibold text-red-500">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default NewsletterSignup;
