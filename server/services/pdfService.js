const PDFDocument = require('pdfkit');

/**
 * Generates an elegant PDF certificate and writes it to a writable stream (e.g. res).
 * @param {string} studentName 
 * @param {string} eventTitle 
 * @param {string} clubName 
 * @param {Date} eventDate 
 * @param {WritableStream} writeStream 
 */
const generateCertificatePDF = (studentName, eventTitle, clubName, eventDate, writeStream) => {
  // Create a landscape orientation PDF
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  // Pipe the doc to the writable stream
  doc.pipe(writeStream);

  const width = doc.page.width;
  const height = doc.page.height;

  // Draw Background Borders
  // Outer border
  doc.rect(20, 20, width - 40, height - 40)
     .lineWidth(3)
     .strokeColor('#6366f1') // Indigo color
     .stroke();

  // Inner thin border
  doc.rect(26, 26, width - 52, height - 52)
     .lineWidth(1)
     .strokeColor('#a5b4fc') // Light Indigo
     .stroke();

  // Corner decorations (simple elegant lines)
  doc.moveTo(35, 55).lineTo(55, 35).lineWidth(2).strokeColor('#6366f1').stroke();
  doc.moveTo(width - 35, 55).lineTo(width - 55, 35).stroke();
  doc.moveTo(35, height - 55).lineTo(55, height - 35).stroke();
  doc.moveTo(width - 35, height - 55).lineTo(width - 55, height - 35).stroke();

  // Certificate Header
  doc.moveDown(3);
  doc.fontSize(38)
     .font('Helvetica-Bold')
     .fillColor('#1e1b4b') // Very dark blue/indigo
     .text('CERTIFICATE OF APPRECIATION', { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(16)
     .font('Helvetica')
     .fillColor('#475569') // Slate grey
     .text('PROUDLY PRESENTED TO', { align: 'center' });

  // Recipient Name
  doc.moveDown(1);
  doc.fontSize(28)
     .font('Helvetica-Bold')
     .fillColor('#6366f1') // Indigo
     .text(studentName.toUpperCase(), { align: 'center' });

  // Underline name
  doc.moveTo(width / 2 - 150, doc.y + 5)
     .lineTo(width / 2 + 150, doc.y + 5)
     .lineWidth(1.5)
     .strokeColor('#a5b4fc')
     .stroke();

  // Certificate text body
  doc.moveDown(2);
  const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.fontSize(14)
     .font('Helvetica')
     .fillColor('#475569')
     .text(`for active participation in the event`, { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(18)
     .font('Helvetica-Bold')
     .fillColor('#1e1b4b')
     .text(`"${eventTitle}"`, { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(14)
     .font('Helvetica')
     .fillColor('#475569')
     .text(`organized by the `, { align: 'center', continued: true })
     .font('Helvetica-Bold')
     .fillColor('#4f46e5')
     .text(clubName, { continued: false });

  doc.moveDown(0.3);
  doc.fontSize(13)
     .font('Helvetica-Oblique')
     .fillColor('#64748b')
     .text(`held on ${formattedDate}`, { align: 'center' });

  // Signatures
  doc.moveDown(3);

  // Left Signature (Club Head / Organizer)
  const leftSigY = doc.y;
  doc.moveTo(100, leftSigY)
     .lineTo(250, leftSigY)
     .lineWidth(1)
     .strokeColor('#cbd5e1')
     .stroke();
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#334155')
     .text('Club President', 100, leftSigY + 8, { width: 150, align: 'center' });
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#64748b')
     .text(clubName, 100, leftSigY + 22, { width: 150, align: 'center' });

  // Right Signature (Faculty Coordinator)
  doc.moveTo(width - 250, leftSigY)
     .lineTo(width - 100, leftSigY)
     .stroke();
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#334155')
     .text('Faculty Coordinator', width - 250, leftSigY + 8, { width: 150, align: 'center' });
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#64748b')
     .text('College Administration', width - 250, leftSigY + 22, { width: 150, align: 'center' });

  // Finalize PDF
  doc.end();
};

module.exports = { generateCertificatePDF };
