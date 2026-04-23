'use client';

import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (typeof window === 'undefined' || typeof (window as any).gtag !== 'function') return;
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      event_category: 'Web Vitals',
      non_interaction: true,
    });
  });
  return null;
}
