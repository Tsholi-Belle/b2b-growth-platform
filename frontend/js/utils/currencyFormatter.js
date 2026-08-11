const SUPPORTED_CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'IND', name: 'Indian Rupee', symbol: '₹' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
];

let exchangeRates = { USD: 1 };
let userCurrency = localStorage.getItem('userCurrency') || 'ZAR';

export async function loadExchangeRates() {
    const cached = sessionStorage.getItem('exchangeRates');
    const cachedTime = sessionStorage.getItem('exchangeRatesTime');
    
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 3600000) {
        exchangeRates = JSON.parse(cached);
        return;
    }

    try {
        const res = await fetch('/api/exchange-rates').catch(() => null);
        if (res && res.ok) {
            exchangeRates = await res.json();
        } else {
            // Mock rates if API fails
            exchangeRates = { USD: 1, ZAR: 19.0, EUR: 0.9, GBP: 0.78, AUD: 1.5, CAD: 1.35, IND: 83.0, NGN: 1100.0, KES: 150.0, JPY: 150.0, CHF: 0.9, BRL: 5.0 };
        }
        sessionStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
        sessionStorage.setItem('exchangeRatesTime', Date.now().toString());
    } catch (e) {
        console.error("Failed to load exchange rates", e);
    }
}

export function convert(amountUSD, targetCurrency) {
    const rate = exchangeRates[targetCurrency] || 1;
    return amountUSD * rate;
}

export function format(amountUSD, targetCurrency = userCurrency, options = {}) {
    const amount = convert(amountUSD, targetCurrency);
    const localeOptions = {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
    };
    
    try {
        return new Intl.NumberFormat('en-US', localeOptions).format(amount);
    } catch (e) {
        const symbol = getCurrencySymbol(targetCurrency);
        return `${symbol}${amount.toFixed(2)}`;
    }
}

export function displayCurrency(val) {
    if (typeof val === 'string') val = parseFloat(val.replace(/,/g, '')) || 0;
    return format(val, userCurrency);
}

export function getCurrencySymbol(currencyCode) {
    const curr = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    return curr ? curr.symbol : currencyCode;
}

export function getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
}

export function getUserCurrency() {
    return userCurrency;
}

export async function setUserCurrency(currencyCode) {
    userCurrency = currencyCode;
    localStorage.setItem('userCurrency', currencyCode);
    
    try {
        await fetch('/api/users/me/currency', {
            method: 'PATCH',
            body: JSON.stringify({ currency: currencyCode }),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.warn('Could not persist currency to backend');
    }

    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currencyCode } }));
}

export function renderCurrencySwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const select = document.createElement('select');
    select.style.cssText = `
        background: rgba(10, 15, 30, 0.6);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.2);
        padding: 0.4rem;
        border-radius: 6px;
        font-family: inherit;
        outline: none;
    `;
    
    SUPPORTED_CURRENCIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = `${c.code} - ${c.name}`;
        if (c.code === userCurrency) opt.selected = true;
        select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
        setUserCurrency(e.target.value);
    });

    container.innerHTML = '';
    container.appendChild(select);
}
