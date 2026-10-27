import original from './playwright.config.js';
export default {...original,timeout:90000,expect:{timeout:30000}};
