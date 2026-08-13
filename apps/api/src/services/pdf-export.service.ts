import PDFDocument from 'pdfkit';
import type { Manifesto, ManifestoPromise } from '@tgim/shared';

export function renderManifestoPdf(manifesto: Manifesto, promises: ManifestoPromise[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `TGIM Manifesto v${manifesto.version}`, Author: 'TGIM' } });
    const chunks: Buffer[] = [];
    document.on('data', chunk => chunks.push(Buffer.from(chunk)));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.fillColor('#172033').fontSize(24).text("The People's Manifesto", { continued: false });
    document.fontSize(10).fillColor('#68758a').text(`Version ${manifesto.version} · Area ${manifesto.area_id} · Published ${new Date(manifesto.updated_at).toLocaleDateString('en-IN')}`);
    document.moveDown();
    for (const promise of promises) {
      if (document.y > 690) document.addPage();
      document.fillColor('#ff5200').fontSize(10).text(promise.time_horizon.toUpperCase());
      document.fillColor('#172033').fontSize(16).text(promise.title);
      document.fillColor('#3f4b5f').fontSize(10).text(promise.description);
      document.fillColor('#078a5b').text(`Target: ${promise.target_metric || 'Metric pending'}`);
      document.fillColor('#68758a').fontSize(8).text(`Source cluster: ${promise.cluster_id || 'Not linked'}`);
      document.moveDown();
    }
    document.fontSize(8).fillColor('#68758a').text('Generated from verified civic evidence. Publication required human approval.');
    document.end();
  });
}
