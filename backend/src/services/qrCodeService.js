const QRCode = require('qrcode');
const config = require('../config/config');

const generateQRCode = async (shortCode, options = {}) => {
  const {
    size = 300,
    margin = 4,
    color = {
      dark: '#000000',
      light: '#FFFFFF'
    },
    format = 'png'
  } = options;

  const url = `${config.app.url}/${shortCode}`;

  const qrOptions = {
    width: size,
    margin,
    color,
    errorCorrectionLevel: 'M'
  };

  try {
    if (format === 'svg') {
      return await QRCode.toString(url, {
        ...qrOptions,
        type: 'svg'
      });
    } else if (format === 'base64') {
      return await QRCode.toDataURL(url, qrOptions);
    } else {
      return await QRCode.toBuffer(url, qrOptions);
    }
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateQRCode
};
