import { useEffect } from 'react';
import Head from 'next/head';
import '../src/styles/main.css';
import '../src/styles/auth.css';
import '../src/styles/dashboard.css';
import '../src/styles/flashcardPlayer.css';
import { AppProvider, useAppContext } from '../src/context/AppContext';

export default function MyApp({ Component, pageProps }) {
  return (
    <AppProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/assets/icons/lua.png" />
      </Head>
      <ThemeWrapper Component={Component} pageProps={pageProps} />
    </AppProvider>
  );
}

function ThemeWrapper({ Component, pageProps }) {
  const { isDarkMode } = useAppContext();

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return <Component {...pageProps} />;
}