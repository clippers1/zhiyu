'use client';
import App from '../../../reader/App';

export default function Reader({ initialRoute, runtime, preloaded }: { initialRoute: any; runtime: any; preloaded: any }) {
  return <App initialRoute={initialRoute} runtime={runtime} preloaded={preloaded} />;
}
