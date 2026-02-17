declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || '';

export const pageview = (url: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const trackCTAClick = (ctaName: string) => {
  event({
    action: 'click_cta',
    category: 'engagement',
    label: ctaName,
  });
  
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'Lead');
  }
};

export const trackCheckoutStart = (planName: string, price: number) => {
  event({
    action: 'checkout_start',
    category: 'ecommerce',
    label: planName,
    value: price,
  });
  
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'InitiateCheckout', {
      value: price,
      currency: 'BRL',
      content_name: planName,
    });
  }
};

export const trackPurchase = (planName: string, price: number, transactionId: string) => {
  event({
    action: 'purchase_success',
    category: 'ecommerce',
    label: planName,
    value: price,
  });
  
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: price,
      currency: 'BRL',
      items: [{
        item_name: planName,
        price: price,
      }],
    });
  }
  
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'Purchase', {
      value: price,
      currency: 'BRL',
      content_name: planName,
    });
  }
};

export const trackRegistration = (method: string = 'email') => {
  event({
    action: 'sign_up',
    category: 'engagement',
    label: method,
  });
  
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'CompleteRegistration');
  }
};
