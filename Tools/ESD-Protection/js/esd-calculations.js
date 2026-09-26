/**
 * ESD Protection Analyzer — Calculations & Data
 * Signal identification patterns, TVS database, and analysis engine.
 */
'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   SIGNAL PATTERN DATABASE
   Each entry: regex, interface name, category, data rate, working voltage,
   polarity, key threat, critical ESD property, standards, surge requirement,
   recommended protection part.
───────────────────────────────────────────────────────────────────────────── */
const ESD_SIGNALS = [
  // ── USB ──────────────────────────────────────────────────────────────────
  {
    regex: /\b(USB_D[PM]|USB_DP|USB_DM|USBDP|USBDM|D\+|D-)\b/gi,
    iface: 'USB 2.0 HS',
    cat: 'high-speed',
    rate: '480 Mbps',
    vrwm: '5.0V',
    pol: 'Bipolar',
    threat: 'Contact discharge from user cable insertion',
    prop: 'C_LINE < 1 pF, fast response (< 1 ns)',
    std: 'IEC 61000-4-2 Level 4 (±8 kV contact)',
    surge: 'N/A',
    part: 'USBLC6-2SC6',
  },
  {
    regex: /\b(ULPI_D\[\d+:\d+\]|ULPI_D\d|ULPI_DIR|ULPI_NXT|ULPI_STP|ULPI_CLK)\b/gi,
    iface: 'USB HS ULPI',
    cat: 'high-speed',
    rate: '480 Mbps',
    vrwm: '1.8V',
    pol: 'Bipolar',
    threat: 'ESD coupled from USB connector through PHY',
    prop: 'Ultra-low C (< 0.5 pF), 1.8V-rated',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'USBLC6-4SC6',
  },
  {
    regex: /\b(USB3?_TX[PM]|USB3?_RX[PM]|SSRX[PM]|SSTX[PM]|USB_SS[DP])\b/gi,
    iface: 'USB 3.x SuperSpeed',
    cat: 'high-speed',
    rate: '5–20 Gbps',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable insertion transient',
    prop: 'Extremely low C (< 0.1 pF), matched pair',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESD008-P2-02VH',
  },
  {
    regex: /\b(VBUS|VBUS_USB|USB_VBUS|5V_USB|VBUS_\w+)\b/gi,
    iface: 'USB Power (VBUS)',
    cat: 'power',
    rate: 'DC',
    vrwm: '5.5V',
    pol: 'Unipolar',
    threat: 'Hot-plug transients, cable energy discharge',
    prop: 'High I_PP, unipolar, fast response',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'SMBJ5.0A',
  },

  // ── Ethernet ─────────────────────────────────────────────────────────────
  {
    regex: /\b(RMII_TXD\d?|RMII_TX_EN|ETH_TX\w*)\b/gi,
    iface: 'Ethernet RMII TX',
    cat: 'high-speed',
    rate: '100 Mbps',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Lightning-induced surge via Ethernet cable',
    prop: 'High surge rating, low clamping voltage',
    std: 'IEC 61000-4-2, IEC 61000-4-5',
    surge: '1 kV surge (1.2/50 µs)',
    part: 'ESDA6V1BC6',
  },
  {
    regex: /\b(RMII_RXD\d?|RMII_CRS_DV|RMII_REF_CLK|ETH_RX\w*)\b/gi,
    iface: 'Ethernet RMII RX',
    cat: 'high-speed',
    rate: '100 Mbps',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Lightning-induced surge via Ethernet cable',
    prop: 'High surge rating, low clamping voltage',
    std: 'IEC 61000-4-2, IEC 61000-4-5',
    surge: '1 kV surge (1.2/50 µs)',
    part: 'ESDA6V1BC6',
  },
  {
    regex: /\b(MDIO|MDC|ETH_MDIO|ETH_MDC|PHY_MDIO|PHY_MDC)\b/gi,
    iface: 'Ethernet MDIO',
    cat: 'low-speed',
    rate: '2.5 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Surge via Ethernet cable',
    prop: 'Moderate C acceptable (< 10 pF)',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1BC6',
  },

  // ── Debug / Programming ───────────────────────────────────────────────────
  {
    regex: /\b(SWDIO|SWCLK|SWO|JTAG_TMS|JTAG_TCK|JTAG_TDI|JTAG_TDO|NTRST|TRST|nTRST)\b/gi,
    iface: 'SWD / JTAG Debug',
    cat: 'low-speed',
    rate: '4 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable discharge during debug sessions',
    prop: 'Low C for signal integrity, low leakage',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1W6',
  },

  // ── User Interface ────────────────────────────────────────────────────────
  {
    regex: /\b(B_USER|USER_BTN|USER_BUTTON|NRST|BOOT0|RESET_BTN)\b/gi,
    iface: 'Push Button',
    cat: 'ui',
    rate: 'DC / debounced',
    vrwm: '3.3V',
    pol: 'Unipolar',
    threat: 'Direct human body discharge from button press',
    prop: 'Low V_CLAMP, low leakage, robust',
    std: 'IEC 61000-4-2 Level 4 (±8 kV contact)',
    surge: 'N/A',
    part: 'ESDA14V2L',
  },
  {
    regex: /\b(TP_SCL|TP_SDA|TOUCH_SCL|TOUCH_SDA|CTP_\w+|TSC_\w+)\b/gi,
    iface: 'Touchscreen',
    cat: 'ui',
    rate: '400 kHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Finger ESD discharge through touchscreen',
    prop: 'Low V_CLAMP, low C, low leakage',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESDA14V2L',
  },

  // ── Audio ─────────────────────────────────────────────────────────────────
  {
    regex:
      /\b(SAI\d?_SD\w*|SAI\d?_SCK\w*|SAI\d?_FS\w*|SAI\d?_MCLK\w*|I2S_SD\w*|I2S_SCK\w*|I2S_WS\w*)\b/gi,
    iface: 'Audio (SAI / I2S)',
    cat: 'analog-rf',
    rate: '12.288 MHz',
    vrwm: '1.8V',
    pol: 'Bipolar',
    threat: 'User cable insertion discharge via audio jack',
    prop: 'Ultra-low C (< 0.3 pF), 1.8V-rated',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESD7383NCTBG',
  },
  {
    regex: /\b(SPDIF_RX\d?|SPDIF_TX\d?|S_PDIF\w*)\b/gi,
    iface: 'S/PDIF Audio',
    cat: 'analog-rf',
    rate: '3.072 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable discharge via audio cable',
    prop: 'Low capacitance, low clamping voltage',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESD7383NCTBG',
  },

  // ── HDMI / Display ────────────────────────────────────────────────────────
  {
    regex: /\b(HDMI_D\d[+-]?|HDMI_CLK[+-]?|HDMI_TMDS\w*)\b/gi,
    iface: 'HDMI TMDS',
    cat: 'high-speed',
    rate: '3.4 Gbps',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable insertion ESD via HDMI connector',
    prop: 'Ultra-low C (< 0.2 pF) for TMDS integrity',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'TPD4E004',
  },
  {
    regex: /\b(HDMI_CEC|HDMI_SCL|HDMI_SDA|HDMI_HPD|HDMI_INT)\b/gi,
    iface: 'HDMI Control',
    cat: 'low-speed',
    rate: '400 kHz',
    vrwm: '5.0V',
    pol: 'Bipolar',
    threat: 'Cable insertion ESD via HDMI connector',
    prop: 'Low V_CLAMP, 5V tolerant',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESDA6V1BC6',
  },

  // ── Serial Buses ──────────────────────────────────────────────────────────
  {
    regex: /\b(SPI\d?_MOSI\d?|SPI\d?_MISO\d?|SPI\d?_SCK\d?|SPI\d?_CS\d?|SPI\d?_NSS\d?)\b/gi,
    iface: 'SPI',
    cat: 'low-speed',
    rate: '50 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable discharge if external connector',
    prop: 'Moderate C acceptable (< 10 pF)',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1W6',
  },
  {
    regex: /\b(I2C\d?_SDA\d?|I2C\d?_SCL\d?|TWI_SDA|TWI_SCL)\b/gi,
    iface: 'I2C',
    cat: 'low-speed',
    rate: '400 kHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable discharge if external connector',
    prop: 'Low leakage (< 1 µA), moderate C',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1BC6',
  },
  {
    regex: /\b(UART\d?_TX\d?|UART\d?_RX\d?|USART\d?_TX\d?|USART\d?_RX\d?|VCP_TX|VCP_RX)\b/gi,
    iface: 'UART / USART',
    cat: 'low-speed',
    rate: '115.2 kbps',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Cable discharge from external device',
    prop: 'Moderate protection, low leakage',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1W6',
  },
  {
    regex: /\b(CAN\d?_TX|CAN\d?_RX|CANL|CANH|CAN_H|CAN_L|FD_CAN\w*)\b/gi,
    iface: 'CAN / CAN FD',
    cat: 'low-speed',
    rate: '1–8 Mbps',
    vrwm: '5.0V',
    pol: 'Bipolar',
    threat: 'Cable surge in automotive/industrial environments',
    prop: 'High surge capability, ±40V transient tolerance',
    std: 'IEC 61000-4-2, ISO 7637-2',
    surge: '±40V transient',
    part: 'PESD2CAN',
  },
  {
    regex: /\b(RS485_A|RS485_B|RS232_TX|RS232_RX|RS485_DE|RS485_RE)\b/gi,
    iface: 'RS-485 / RS-232',
    cat: 'low-speed',
    rate: '10 Mbps',
    vrwm: '5.0V',
    pol: 'Bipolar',
    threat: 'Lightning / surge via long cable run',
    prop: 'High surge energy absorption, broad voltage tolerance',
    std: 'IEC 61000-4-5',
    surge: '2 kV surge (1.2/50 µs)',
    part: 'SM712',
  },

  // ── RF ─────────────────────────────────────────────────────────────────────
  {
    regex: /\b(ANT\d?|RF_IN\d?|RF_OUT\d?|ANT_MAIN|ANT_DIV|ANT_\w+)\b/gi,
    iface: 'RF Antenna',
    cat: 'analog-rf',
    rate: '≤6 GHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Antenna discharge, lightning coupling',
    prop: 'Ultra-low C (< 0.1 pF), extremely low insertion loss',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'PESD0402',
  },

  // ── Camera / Video ────────────────────────────────────────────────────────
  {
    regex: /\b(DCMI_D\d|DCMI_HSYNC|DCMI_VSYNC|DCMI_PIXCLK)\b/gi,
    iface: 'Camera DCMI',
    cat: 'high-speed',
    rate: '54 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'ESD from camera module connector insertion',
    prop: 'Low C for parallel data bus integrity',
    std: 'IEC 61000-4-2 Level 3',
    surge: 'N/A',
    part: 'ESDA6V1BC6',
  },
  {
    regex: /\b(LCD_R\d|LCD_G\d|LCD_B\d|LCD_HSYNC|LCD_VSYNC|LCD_CLK|LCD_DE|LTDC_\w+)\b/gi,
    iface: 'LCD RGB',
    cat: 'high-speed',
    rate: '33 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'FPC connector discharge',
    prop: 'Low C for display signal fidelity',
    std: 'IEC 61000-4-2 Level 2',
    surge: 'N/A',
    part: 'ESDA6V1W6',
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    regex:
      /\b(uSD_D\d|uSD_CLK|uSD_CMD|SD_D\d|SD_CLK|SD_CMD|SDMMC\d?_D\d|SDMMC\d?_CK|SDMMC\d?_CMD)\b/gi,
    iface: 'SD Card / SDMMC',
    cat: 'low-speed',
    rate: '25 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'User card insertion discharge',
    prop: 'Low C, fast response, 3.3V tolerant',
    std: 'IEC 61000-4-2 Level 4',
    surge: 'N/A',
    part: 'ESDA6V1BC6',
  },
  {
    regex: /\b(QSPI_D\d|QSPI_CLK|QSPI_NCS|QSPI_BK\d\w*)\b/gi,
    iface: 'QSPI Flash',
    cat: 'high-speed',
    rate: '108 MHz',
    vrwm: '3.3V',
    pol: 'Bipolar',
    threat: 'Internal signals — low ESD risk unless connector present',
    prop: 'Low C for high-speed flash bandwidth',
    std: 'Internal / low risk',
    surge: 'N/A',
    part: 'ESDA6V1W6',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   TVS DEVICE DATABASE
───────────────────────────────────────────────────────────────────────────── */
const TVS_DB = {
  'USBLC6-2SC6': {
    mfr: 'STMicroelectronics',
    pkg: 'SOT-23-6',
    vrwm: '5.25 V',
    vclamp: '15 V @ 8 kV',
    cline: '0.5 pF',
    ipp: '3 A',
    channels: 2,
    badge: 'USB 2.0 optimized',
    badgeType: 'success',
    note: 'Bidirectional on D+ and D−, unidirectional VBUS clamp. Rail-to-rail topology. The gold standard for USB 2.0 HS protection.',
  },
  'USBLC6-4SC6': {
    mfr: 'STMicroelectronics',
    pkg: 'SOT-23-6',
    vrwm: '5.25 V',
    vclamp: '15 V @ 8 kV',
    cline: '0.5 pF',
    ipp: '3 A',
    channels: 4,
    badge: '4-channel variant',
    badgeType: 'success',
    note: 'Same as USBLC6-2SC6 but adds protection for ID and VBUS in the same package. Useful for full-featured USB-A ports.',
  },
  'ESD008-P2-02VH': {
    mfr: 'Nexperia',
    pkg: 'SOT-363',
    vrwm: '3.3 V',
    vclamp: '8 V @ 8 kV',
    cline: '0.08 pF',
    ipp: '2 A',
    channels: 2,
    badge: 'USB 3.x / PCIe',
    badgeType: 'success',
    note: 'Designed specifically for SuperSpeed differential pairs. Extremely low capacitance (< 0.1 pF) preserves eye opening at 5–20 Gbps.',
  },
  ESDA6V1BC6: {
    mfr: 'STMicroelectronics',
    pkg: 'SOT-23-6',
    vrwm: '6.1 V',
    vclamp: '13 V @ 8 kV',
    cline: '3.5 pF',
    ipp: '7 A',
    channels: 2,
    badge: 'Ethernet / I2C / SD',
    badgeType: 'success',
    note: 'High surge capability (7 A) makes this ideal for Ethernet lines exposed to lightning-induced surges. Also excellent for I2C and SD card interfaces.',
  },
  ESDA6V1W6: {
    mfr: 'STMicroelectronics',
    pkg: 'SOT-323-6',
    vrwm: '6.1 V',
    vclamp: '14 V @ 8 kV',
    cline: '2.5 pF',
    ipp: '5 A',
    channels: 2,
    badge: 'General low-speed IO',
    badgeType: 'success',
    note: 'Compact SOT-323 package. Lower capacitance than ESDA6V1BC6. Suitable for SWD, UART, SPI, and other low-speed interfaces up to ~50 MHz.',
  },
  'SMBJ5.0A': {
    mfr: 'Vishay',
    pkg: 'SMB (DO-214AA)',
    vrwm: '5.0 V',
    vclamp: '9.2 V @ 78 A',
    cline: '350 pF',
    ipp: '78 A',
    channels: 1,
    badge: 'Power lines only',
    badgeType: 'warning',
    note: 'Very high current handling capacity (78 A peak). High capacitance (350 pF) means it is unsuitable for signal lines — power rails and VBUS only.',
  },
  ESDA14V2L: {
    mfr: 'STMicroelectronics',
    pkg: 'SOT-23',
    vrwm: '14.0 V',
    vclamp: '25 V @ 8 kV',
    cline: '3 pF',
    ipp: '6 A',
    channels: 1,
    badge: 'Buttons / 12V IO',
    badgeType: 'success',
    note: 'Unipolar device suited for push buttons, reset lines, and 12V-tolerant IO. Robust construction handles repeated direct human contact discharge.',
  },
  ESD7383NCTBG: {
    mfr: 'ON Semiconductor',
    pkg: 'DFN-2×1',
    vrwm: '3.3 V',
    vclamp: '9 V @ 8 kV',
    cline: '0.25 pF',
    ipp: '4 A',
    channels: 4,
    badge: 'Audio / 1.8V IO',
    badgeType: 'success',
    note: 'Ultra-low capacitance protects audio interfaces without audible degradation. 1.8V-tolerant for modern low-power audio codecs (SAI/I2S).',
  },
  PESD2CAN: {
    mfr: 'Nexperia',
    pkg: 'SOT-23',
    vrwm: '24 V',
    vclamp: '45 V @ 8 kV',
    cline: '5 pF',
    ipp: '12 A',
    channels: 2,
    badge: 'CAN bus optimized',
    badgeType: 'success',
    note: 'Designed for the CAN bus operating voltage range. Handles automotive ISO 7637-2 transients and industrial surge conditions.',
  },
  SM712: {
    mfr: 'Littelfuse',
    pkg: 'SOT-23',
    vrwm: '12 V',
    vclamp: '26 V @ 8 kV',
    cline: '50 pF',
    ipp: '17 A',
    channels: 2,
    badge: 'RS-485 / RS-422',
    badgeType: 'success',
    note: 'High-energy surge absorber for RS-485 and RS-422 lines on long cable runs. Handles IEC 61000-4-5 surge requirements at industrial sites.',
  },
  PESD0402: {
    mfr: 'Nexperia',
    pkg: '0402 (LLP-2)',
    vrwm: '3.3 V',
    vclamp: '8 V @ 8 kV',
    cline: '0.08 pF',
    ipp: '2 A',
    channels: 1,
    badge: 'RF antenna grade',
    badgeType: 'success',
    note: 'Smallest RF ESD protection device. Insertion loss < 0.1 dB at 6 GHz. Critical for antenna ports where any extra capacitance detunes the matching network.',
  },
  TPD4E004: {
    mfr: 'Texas Instruments',
    pkg: 'WCSP-6',
    vrwm: '5.5 V',
    vclamp: '10 V @ 8 kV',
    cline: '0.15 pF',
    ipp: '4 A',
    channels: 4,
    badge: 'HDMI optimized',
    badgeType: 'success',
    note: '4-channel device purpose-built for HDMI 2.0 TMDS differential pairs. TI-specified ESD IEC 61000-4-2 Level 4 compliant. Includes integrated impedance matching.',
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   TEXT EXTRACTION UTILITIES
───────────────────────────────────────────────────────────────────────────── */
async function extractTextFromPDF(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  let fullText = '';

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `===== PAGE ${p} =====\n${pageText}\n\n`;
  }

  return { text: fullText, pages: totalPages };
}

function cleanExtractedText(raw) {
  let text = raw;
  // Remove license blocks from ST schematics
  text = text.replace(/Open Platform License Agreement[\s\S]*?www\.st\.com\/opla/gi, '');
  // Remove page markers
  text = text.replace(/^===== PAGE \d+ =====$/gm, '');
  // Remove Altium net/component label fragments
  text = text.replace(/\S+\.SchDoc/gi, '');
  text = text.replace(
    /\b(PIU|PIC|PIR|PIL|PID|PIX|PIT|PISB|PICN|PIJP|PITP|PILD)\d+[A-Z]?\d*\b/g,
    ''
  );
  text = text.replace(/\b(COC|COR|COL|COU|COD|CON|COT|COX|COSB|COJP|COTP|COLD|COCN)\d+\b/g, '');
  text = text.replace(/\bNL[A-Z0-9]{8,}\b/g, '');
  text = text.replace(/\bPO[A-Z0-9]{8,}\b/g, '');
  text = text.replace(/\[No Variations\]/g, '');
  // Compress whitespace
  text = text.replace(/ {3,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/* ─────────────────────────────────────────────────────────────────────────────
   SIGNAL ANALYSIS ENGINE
───────────────────────────────────────────────────────────────────────────── */
function identifySignals(text, includeInternal = false) {
  const seen = new Set();
  const results = [];
  const internalParts = ['internal esd', 'fmc/', 'sdram', 'qspi'];

  for (const pattern of ESD_SIGNALS) {
    // Skip internal signals if option not set
    if (!includeInternal) {
      const isInternal =
        pattern.part === 'Internal ESD' ||
        internalParts.some(k => pattern.iface.toLowerCase().includes(k));
      if (isInternal) continue;
    }

    const matches = text.match(pattern.regex);
    if (!matches) continue;

    const unique = [];
    for (const m of matches) {
      const key = m.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
    }

    if (unique.length > 0) {
      results.push({
        name: unique.join(' / '),
        iface: pattern.iface,
        cat: pattern.cat,
        rate: pattern.rate,
        vrwm: pattern.vrwm,
        pol: pattern.pol,
        threat: pattern.threat,
        prop: pattern.prop,
        std: pattern.std,
        surge: pattern.surge,
        part: pattern.part,
        component: '—',
        desc: pattern.iface + ' signals',
      });
    }
  }

  return results;
}

function identifyComponents(text) {
  const icPatterns = [
    /\b(STM32\w+)\b/gi,
    /\b(LAN8742\w*)\b/gi,
    /\b(USB3320\w*)\b/gi,
    /\b(WM8994\w*)\b/gi,
    /\b(WM8960\w*)\b/gi,
    /\b(MT25QL\w*)\b/gi,
    /\b(IS42S\w+)\b/gi,
    /\b(STMPS\d+\w*)\b/gi,
    /\b(LD\d{4}\w*)\b/gi,
    /\b(74LVC\w+)\b/gi,
    /\b(IMP34\w+)\b/gi,
    /\b(nRF\d+\w*)\b/gi,
    /\b(ESP\d+\w*)\b/gi,
    /\b(RP\d{4}\w*)\b/gi,
  ];

  const components = {};
  for (const pat of icPatterns) {
    const matches = text.match(pat);
    if (matches) {
      for (const ic of matches) {
        components[ic.toUpperCase()] = ic;
      }
    }
  }
  return components;
}

function annotateWithComponents(signals, components, text) {
  const stm32 = Object.keys(components).find(k => k.startsWith('STM32'));
  const lan = Object.keys(components).find(k => k.startsWith('LAN'));
  const usb = Object.keys(components).find(k => k.startsWith('USB3'));
  const wm = Object.keys(components).find(k => k.startsWith('WM'));

  for (const sig of signals) {
    sig.component = '—';
    if (sig.iface.includes('Ethernet') && lan) sig.component = components[lan];
    else if (sig.iface.includes('USB') && usb) sig.component = components[usb];
    else if (sig.iface.includes('Audio') && wm) sig.component = components[wm];
    else if (stm32) sig.component = components[stm32];
    sig.desc = `${sig.name} — ${sig.iface} interface`;
  }
  return signals;
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────────────────── */
window.EsdCalc = {
  ESD_SIGNALS,
  TVS_DB,
  extractTextFromPDF,
  cleanExtractedText,
  identifySignals,
  identifyComponents,
  annotateWithComponents,
};
