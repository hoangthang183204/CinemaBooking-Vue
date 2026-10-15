const BANK_BIN = '970407'
const ACCOUNT_NUMBER = '19076145844018'
export const PAYMENT_ACCOUNT_NAME = 'TECHCOMBANK'

function tlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value
}

function ascii(value, max) {
  const clean = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
  const text = clean || 'CINEMA'
  return text.slice(0, max)
}

function crc16(value) {
  let crc = 0xffff
  for (let i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function paymentQrPayload(bookingId, amount, bank = {}) {
  const money = Math.trunc(Number(amount) || 0)
  const bin = bank.bankBin || BANK_BIN
  const account = bank.accountNumber || ACCOUNT_NUMBER
  const name = bank.accountName || PAYMENT_ACCOUNT_NAME
  const merchant = tlv('00', 'A000000727')
    + tlv('01', tlv('00', bin) + tlv('01', account))
    + tlv('02', 'QRIBFTTA')
  const body = tlv('00', '01')
    + tlv('01', '12')
    + tlv('38', merchant)
    + tlv('53', '704')
    + tlv('54', String(money))
    + tlv('58', 'VN')
    + tlv('59', ascii(name, 25))
    + tlv('60', 'HANOI')
    + tlv('62', tlv('08', ascii(`VE ${bookingId}`, 25)))
    + '6304'
  return body + crc16(body)
}

export function paymentQrUrl(bookingId, amount, bank) {
  const payload = paymentQrPayload(bookingId, amount, bank)
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`
}
