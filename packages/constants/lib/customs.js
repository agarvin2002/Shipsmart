const DUTIES_PAYMENT = {
  SENDER: 'SENDER',
  RECIPIENT: 'RECIPIENT',
  THIRD_PARTY: 'THIRD_PARTY',
};

const CONTENT_TYPES = {
  MERCHANDISE: 'MERCHANDISE',
  DOCUMENTS: 'DOCUMENTS',
  GIFT: 'GIFT',
  SAMPLE: 'SAMPLE',
  RETURN: 'RETURN',
};

const INCOTERMS = {
  DAP: 'DAP', // Delivered At Place
  DDP: 'DDP', // Delivered Duty Paid
  DDU: 'DDU', // Delivered Duty Unpaid
};

module.exports = {
  DUTIES_PAYMENT,
  CONTENT_TYPES,
  INCOTERMS,
};
