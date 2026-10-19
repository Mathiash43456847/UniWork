import rawBase64 from '../../base64.txt?raw';
import darkRawBase64 from '../../UniWork_Dark_base64.txt?raw';
import yptRawBase64 from '../../company_logo/YPT_logo.txt?raw';
import tickRawBase64 from '../../company_logo/Tick.txt?raw';
import forestRawBase64 from '../../company_logo/Forest.txt?raw';
import googleRawBase64 from '../../company_logo/Google.txt?raw';
import unialRawBase64 from '../../company_logo/Unial_Corp.txt?raw';

export const UNIWORK_FULL_LOGO_BASE64 = `data:image/png;base64,${rawBase64.replace(/[\r\n]+/g, '')}`;
export const UNIWORK_DARK_LOGO_BASE64 = `data:image/png;base64,${darkRawBase64.replace(/[\r\n]+/g, '')}`;
export const UNIAL_CORP_LOGO_BASE64 = `data:image/png;base64,${unialRawBase64.replace(/[\r\n]+/g, '')}`;
export const YPT_LOGO_BASE64 = `data:image/png;base64,${yptRawBase64.replace(/[\r\n]+/g, '')}`;
export const TICK_LOGO_BASE64 = `data:image/png;base64,${tickRawBase64.replace(/[\r\n]+/g, '')}`;
export const FOREST_LOGO_BASE64 = `data:image/png;base64,${forestRawBase64.replace(/[\r\n]+/g, '')}`;
export const GOOGLE_LOGO_BASE64 = `data:image/png;base64,${googleRawBase64.replace(/[\r\n]+/g, '')}`;
export const GOOGLE_CALENDAR_LOGO = GOOGLE_LOGO_BASE64;
export const UNIWORK_MINI_LOGO_BASE64 = '';
export const IWORK_FULL_LOGO_BASE64 = UNIWORK_FULL_LOGO_BASE64;
export const IWORK_MINI_LOGO_BASE64 = UNIWORK_MINI_LOGO_BASE64;

