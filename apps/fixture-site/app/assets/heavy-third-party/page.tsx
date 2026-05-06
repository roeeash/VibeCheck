import Script from 'next/script';

export default function HeavyThirdParty() {
  return (
    <>
      <Script src="https://www.googletagmanager.com/gtm.js?id=GTM-FAKE" strategy="lazyOnload" />
      <Script src="https://www.google-analytics.com/analytics.js" strategy="lazyOnload" />
      <div>
        <h1>Heavy Third-Party Cost</h1>
        <p>This page loads analytics, tag manager, and other third-party scripts.</p>
      </div>
    </>
  );
}
