'use client';

import { zipSync, strToU8 } from 'fflate';
import { callScript, channelDisputeCopy, sha256Hex, stableJson } from './response-file';
import { api } from './client-api';

type Row = Record<string, string | number | null>;
type Bundle = { case: Row; evidence: Row[]; chronology: Row[]; observations: Array<Record<string, unknown>>; resolutions: Array<Record<string, unknown>>; findings: Row[]; custody: Row[]; passport: { coverage: { present: number; total: number }; counts: { passed: number; conflicts: number; missing: number; unknownFacts: number }; checks: Array<{ status: string; titleEn: string; detailEn: string }>; facts: Array<{ field: string; resolution: { value?: string; resolutionType?: string } | null; observations: Array<{ filename?: string; value?: string }> }> } };
type ReceiptBundle = Bundle & { profile?: Row | null; submission?: Row | null; events?: Row[] };

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.replace(/\n/g, ' \n ').split(/\s+/); const lines: string[] = []; let line = '';
  for (const word of words) {
    if (word === '\n') { if (line) lines.push(line); line = ''; continue; }
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line); return lines;
}

async function renderPdfPages(bundle: Bundle) {
  const row = bundle.case; const pages: Blob[] = [];
  const workspaceStarted = new Date(Number(row.created_at || 0)).toLocaleString('en-IN');
  const sections = [
    {
      title: 'FIRST30 Complete Report', subtitle: 'Your complaint, screenshots and important details in one place',
      blocks: [
        `REPORT STARTED\n${workspaceStarted}\nThis is a FIRST30 demonstration. It was not sent to a bank, police or government system.`,
        `WHAT IS READY\nScreenshot types added: ${bundle.passport.coverage.present}/${bundle.passport.coverage.total}\nDetails matched: ${bundle.passport.counts.passed}\nDifferences to review: ${bundle.passport.counts.conflicts}\nDetails not found: ${bundle.passport.counts.missing}\nDetails marked "I do not know": ${bundle.passport.counts.unknownFacts}`,
        `IMPORTANT DETAILS AND WHERE THEY CAME FROM\n${bundle.passport.facts.map((fact) => `${fact.field.replace('_', ' ')}: ${fact.resolution?.value || 'I do not know'} · ${fact.observations.map((item) => item.filename).filter(Boolean).join(', ') || (fact.resolution?.resolutionType === 'manual' ? 'Entered by citizen' : 'No screenshot available')}`).join('\n')}`,
      ],
    },
    {
      title: 'Checks and timeline', subtitle: 'Clear reasons are shown for anything that needs attention',
      blocks: [
        `DETAILS TO CHECK\n${bundle.passport.checks.map((check) => `${check.status === 'pass' ? 'MATCHED' : check.status === 'conflict' ? 'PLEASE CHECK' : 'NOT FOUND'} — ${check.titleEn}: ${check.detailEn}`).join('\n')}`,
        `TIMES FOUND IN YOUR SCREENSHOTS\n${bundle.observations.filter((item) => item.field === 'occurred_at').sort((a,b) => String(a.value).localeCompare(String(b.value))).map((item) => `${item.value} — ${item.evidenceKind} · ${item.filename} · ${item.sourceText}`).join('\n') || 'No date or time was found in the screenshots.'}`,
        `YOUR EXPLANATIONS\n${bundle.findings.filter((item) => item.status === 'conflict').map((item) => `${item.acknowledgement_note || 'No explanation added.'}`).join('\n') || 'No differences need an explanation.'}`,
      ],
    },
    {
      title: 'Documents ready to use', subtitle: 'Please read these documents before sharing them',
      blocks: [
        `ENGLISH COMPLAINT\n${String(row.complaint_en || '')}`,
        `BANK DISPUTE LETTER\n${channelDisputeCopy(String(row.channel || ''), String(row.bank || ''))}`,
        `1930 CALL SCRIPT\n${callScript({ amount: row.amount, channel: row.channel, reference: row.reference, occurredAt: row.occurred_at })}`,
        `SCREENSHOTS INCLUDED\n${bundle.evidence.map((item, index) => `${index + 1}. ${item.filename} · ${String(item.kind).replace('_', ' ')}`).join('\n')}`,
      ],
    },
  ];

  function startPage(title: string, subtitle: string, pageNumber: number) {
    const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas unavailable.');
    ctx.fillStyle = '#fffefa'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#df5b34'; ctx.fillRect(0, 0, 26, canvas.height);
    ctx.fillStyle = '#14273d'; ctx.font = '800 54px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText(title, 92, 120);
    ctx.fillStyle = '#5e6c7b'; ctx.font = '500 25px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText(pageNumber === 1 ? subtitle : `${subtitle} · continued`, 92, 166);
    ctx.strokeStyle = '#dce1df'; ctx.beginPath(); ctx.moveTo(92, 205); ctx.lineTo(1148, 205); ctx.stroke();
    return { canvas, ctx };
  }

  async function finishPage(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, pageNumber: number) {
    ctx.fillStyle = '#758391'; ctx.font = '500 18px system-ui';
    ctx.fillText(`FIRST30 · Demonstration only · Nothing was sent outside FIRST30 · Page ${pageNumber}`, 92, 1700);
    pages.push(await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render PDF page.')), 'image/jpeg', 0.9)));
  }

  for (const section of sections) {
    let pageNumber = 1; let { canvas, ctx } = startPage(section.title, section.subtitle, pageNumber); let y = 275;
    const nextPage = async () => {
      await finishPage(canvas, ctx, pageNumber); pageNumber += 1;
      const next = startPage(section.title, section.subtitle, pageNumber); canvas = next.canvas; ctx = next.ctx; y = 275;
    };
    for (const block of section.blocks) {
      const [heading, ...body] = block.split('\n');
      if (y > 1540) await nextPage();
      ctx.fillStyle = '#14273d'; ctx.font = '800 24px system-ui, "Noto Sans Devanagari", sans-serif';
      for (const line of wrapText(ctx, heading, 1030)) { if (y > 1620) { await nextPage(); ctx.fillStyle = '#14273d'; ctx.font = '800 24px system-ui, "Noto Sans Devanagari", sans-serif'; } ctx.fillText(line, 92, y); y += 36; }
      ctx.fillStyle = '#34495d'; ctx.font = '500 22px system-ui, "Noto Sans Devanagari", sans-serif';
      for (const paragraph of body) {
        for (const line of wrapText(ctx, paragraph || ' ', 1030)) { if (y > 1620) { await nextPage(); ctx.fillStyle = '#34495d'; ctx.font = '500 22px system-ui, "Noto Sans Devanagari", sans-serif'; } ctx.fillText(line, 92, y); y += 33; }
      }
      y += 36;
    }
    await finishPage(canvas, ctx, pageNumber);
  }
  return pages;
}

function concat(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const out = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; } return out;
}

async function jpegPagesToPdf(blobs: Blob[]) {
  const encoder = new TextEncoder(); const objects: Uint8Array[] = []; const pageRefs: string[] = [];
  objects[0] = encoder.encode('<< /Type /Catalog /Pages 2 0 R >>');
  const pageData = await Promise.all(blobs.map(async (blob) => new Uint8Array(await blob.arrayBuffer())));
  for (let index = 0; index < pageData.length; index++) {
    const pageObject = 3 + index * 3; const imageObject = pageObject + 1; const contentObject = pageObject + 2;
    pageRefs.push(`${pageObject} 0 R`);
    objects[pageObject - 1] = encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects[imageObject - 1] = concat([encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pageData[index].length} >>\nstream\n`), pageData[index], encoder.encode('\nendstream')]);
    const content = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
    objects[contentObject - 1] = encoder.encode(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = encoder.encode(`<< /Type /Pages /Count ${pageData.length} /Kids [${pageRefs.join(' ')}] >>`);
  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n%FIRST30\n')]; const offsets = [0]; let offset = chunks[0].length;
  objects.forEach((object, index) => { offsets[index + 1] = offset; const chunk = concat([encoder.encode(`${index + 1} 0 obj\n`), object, encoder.encode('\nendobj\n')]); chunks.push(chunk); offset += chunk.length; });
  const xrefOffset = offset; const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n \n`)].join('');
  chunks.push(encoder.encode(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return concat(chunks);
}

function receiptStatus(status: unknown) {
  const labels: Record<string, string> = {
    submitted: 'Report received',
    action_required: 'Additional evidence requested',
    evidence_received: 'Additional evidence received',
  };
  return labels[String(status || '')] || 'Report recorded';
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
}

async function renderComplaintReceiptPages(bundle: ReceiptBundle) {
  const row = bundle.case; const pages: Blob[] = []; const ack = String(bundle.submission?.acknowledgement || 'F30-DEMO-PENDING');
  const createdAt = Number(bundle.submission?.submitted_at || bundle.submission?.created_at || row.updated_at || Date.now());
  const copy = {
    receipt: 'Complaint receipt',
    independent: 'Independent demonstration',
    mock: 'DEMO - NOT AN OFFICIAL COMPLAINT',
    acknowledgement: 'FIRST30 acknowledgement',
    summary: 'Incident summary',
    amount: 'Reported amount',
    channel: 'Payment channel',
    reference: 'Transaction reference',
    institution: 'Bank / wallet',
    time: 'Incident time',
    status: 'Current status',
    statement: 'Citizen statement',
    evidence: 'Evidence overview',
    files: 'files attached',
    checks: 'details matched',
    conflicts: 'differences need review',
    complaintEn: 'Complaint - English',
    prepared: 'Prepared complaint',
    limitation: 'This receipt was created only inside the FIRST30 demonstration. It was not submitted to NCRP, police, a bank or any government system.',
  };

  function startPage(pageNumber: number, continuation = false) {
    const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas unavailable.');
    ctx.fillStyle = '#f7f2e8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef624c'; ctx.fillRect(0, 0, canvas.width, 18);
    ctx.fillStyle = '#10283c'; ctx.fillRect(0, 18, canvas.width, continuation ? 156 : 340);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 34px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText('30', 78, 92);
    ctx.font = '800 27px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText('FIRST30', 142, 91);
    ctx.fillStyle = '#abc0ce'; ctx.font = '700 16px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText(continuation ? copy.prepared.toUpperCase() : copy.independent.toUpperCase(), 78, 124);
    ctx.fillStyle = '#ef624c'; fillRoundedRect(ctx, 822, 62, 338, 52, 26);
    ctx.fillStyle = '#ffffff'; ctx.font = '800 16px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(copy.mock, 991, 95); ctx.textAlign = 'left';
    if (!continuation) {
      ctx.fillStyle = '#ffffff'; ctx.font = '800 58px Georgia, "Noto Sans Devanagari", serif'; ctx.fillText(copy.receipt, 78, 220);
      ctx.fillStyle = '#abc0ce'; ctx.font = '700 17px system-ui, "Noto Sans Devanagari", sans-serif'; ctx.fillText(copy.acknowledgement.toUpperCase(), 78, 266);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 30px ui-monospace, SFMono-Regular, monospace'; ctx.fillText(ack, 78, 309);
    }
    return { canvas, ctx, pageNumber, y: continuation ? 222 : 410 };
  }

  async function finishPage(page: ReturnType<typeof startPage>) {
    const { canvas, ctx, pageNumber } = page;
    ctx.strokeStyle = '#d4cec2'; ctx.beginPath(); ctx.moveTo(78, 1652); ctx.lineTo(1162, 1652); ctx.stroke();
    ctx.fillStyle = '#62717a'; ctx.font = '600 15px system-ui, "Noto Sans Devanagari", sans-serif';
    ctx.fillText('FIRST30 · Demonstration only · Nothing was sent outside FIRST30', 78, 1692);
    ctx.textAlign = 'right'; ctx.fillText(`Page ${pageNumber}`, 1162, 1692); ctx.textAlign = 'left';
    pages.push(await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not render complaint receipt.')), 'image/jpeg', 0.94)));
  }

  let page = startPage(1);
  const ensure = async (height: number) => { if (page.y + height <= 1595) return; await finishPage(page); page = startPage(page.pageNumber + 1, true); };
  const nextPage = async () => { await finishPage(page); page = startPage(page.pageNumber + 1, true); };
  const heading = async (title: string) => { await ensure(72); page.ctx.fillStyle = '#10283c'; page.ctx.font = '800 24px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(title, 78, page.y); page.y += 42; };
  const paragraph = async (text: string, color = '#344b5a') => {
    page.ctx.font = '500 21px system-ui, "Noto Sans Devanagari", sans-serif';
    const lines = wrapText(page.ctx, text || 'Unknown', 1060);
    const paragraphHeight = lines.length * 31 + 18;
    if (paragraphHeight <= 1370) await ensure(paragraphHeight);
    for (const line of lines) { await ensure(34); page.ctx.fillStyle = color; page.ctx.font = '500 21px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(line, 78, page.y); page.y += 31; }
    page.y += 18;
  };
  const textSection = async (title: string, text: string) => {
    page.ctx.font = '500 21px system-ui, "Noto Sans Devanagari", sans-serif';
    const lines = wrapText(page.ctx, text || 'Unknown', 1060);
    const sectionHeight = 42 + lines.length * 31 + 18;
    if (sectionHeight <= 1370) await ensure(sectionHeight);
    await heading(title);
    await paragraph(text);
  };

  page.ctx.fillStyle = '#ffffff'; fillRoundedRect(page.ctx, 78, page.y, 1084, 132, 14);
  const statusItems = [[copy.status, receiptStatus(bundle.submission?.status)], ['Created', new Date(createdAt).toLocaleString('en-IN')]];
  statusItems.forEach(([label, value], index) => { const x = 108 + index * 525; page.ctx.fillStyle = '#6c7a82'; page.ctx.font = '800 15px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(label.toUpperCase(), x, page.y + 42); page.ctx.fillStyle = '#10283c'; page.ctx.font = '800 24px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(value, x, page.y + 83); });
  page.y += 178;

  await heading(copy.summary);
  const details = [
    [copy.amount, `INR ${Number(row.amount || 0).toLocaleString('en-IN')}`], [copy.channel, String(row.channel || 'Unknown').replaceAll('_', ' ').toUpperCase()],
    [copy.reference, String(row.reference || 'Unknown')], [copy.institution, String(row.bank || 'Unknown')],
    [copy.time, String(row.occurred_at || 'Unknown')], ['Recipient', String(row.recipient || 'Unknown')],
  ];
  for (let index = 0; index < details.length; index += 2) {
    await ensure(112); const rowY = page.y;
    details.slice(index, index + 2).forEach(([label, value], column) => { const x = 78 + column * 552; page.ctx.fillStyle = '#ffffff'; fillRoundedRect(page.ctx, x, rowY, 532, 94, 10); page.ctx.fillStyle = '#6c7a82'; page.ctx.font = '800 14px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(label.toUpperCase(), x + 22, rowY + 30); page.ctx.fillStyle = '#10283c'; page.ctx.font = '800 21px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(String(value).slice(0, 42), x + 22, rowY + 65); });
    page.y += 110;
  }
  page.y += 12;

  await heading(copy.evidence);
  page.ctx.fillStyle = '#e8efe9'; fillRoundedRect(page.ctx, 78, page.y, 1084, 92, 10);
  const evidenceLine = `${bundle.evidence.length} ${copy.files}   ·   ${bundle.passport.counts.passed} ${copy.checks}   ·   ${bundle.passport.counts.conflicts} ${copy.conflicts}`;
  page.ctx.fillStyle = '#245d4d'; page.ctx.font = '800 20px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(evidenceLine, 104, page.y + 55); page.y += 130;

  await textSection(copy.statement, String(row.narrative_input || row.complaint_en || 'Unknown'));
  await nextPage();
  await textSection(copy.complaintEn, String(row.complaint_en || 'Unknown'));
  await ensure(145); page.ctx.fillStyle = '#fde5de'; fillRoundedRect(page.ctx, 78, page.y, 1084, 112, 10); page.ctx.fillStyle = '#9a392b'; page.ctx.font = '800 17px system-ui, "Noto Sans Devanagari", sans-serif'; page.ctx.fillText(copy.mock, 104, page.y + 33); page.ctx.font = '600 17px system-ui, "Noto Sans Devanagari", sans-serif';
  const limitationLines = wrapText(page.ctx, copy.limitation, 1028); limitationLines.slice(0, 3).forEach((line, index) => page.ctx.fillText(line, 104, page.y + 62 + index * 23)); page.y += 135;
  await finishPage(page);
  return pages;
}

export async function downloadComplaintReceipt(bundle: ReceiptBundle) {
  const pdf = await buildComplaintReceiptPdf(bundle);
  const acknowledgement = String(bundle.submission?.acknowledgement || 'F30-DEMO');
  const blob = new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }); const url = URL.createObjectURL(blob);
  const filename = `FIRST30-complaint-receipt-${acknowledgement}.pdf`;
  const link = document.createElement('a'); link.href = url; link.download = filename; link.hidden = true; document.body.appendChild(link); link.click(); link.remove();
  return { downloadUrl: url, filename };
}

export async function buildComplaintReceiptPdf(bundle: ReceiptBundle) {
  return jpegPagesToPdf(await renderComplaintReceiptPages(bundle));
}

export async function buildResponsePackage(caseId: string, bundle: Bundle) {
  const files: Record<string, Uint8Array> = {}; const manifestFiles: Array<Record<string, unknown>> = [];
  for (const [index, evidence] of bundle.evidence.entries()) {
    const response = await fetch(`/api/cases/${caseId}/evidence/${evidence.id}`);
    if (!response.ok) throw new Error(`Could not read ${evidence.filename}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = await sha256Hex(bytes);
    if (digest !== evidence.sha256) throw new Error(`${evidence.filename} has changed since it was added. Please remove it and add it again.`);
    const path = `evidence/${String(index + 1).padStart(2, '0')}-${String(evidence.filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    files[path] = bytes; manifestFiles.push({ path, mimeType: evidence.mime_type, size: bytes.length, sha256: digest, evidenceId: evidence.id });
  }
  const pdf = await jpegPagesToPdf(await renderPdfPages(bundle)); files['FIRST30-complete-report.pdf'] = pdf;
  manifestFiles.push({ path: 'FIRST30-complete-report.pdf', mimeType: 'application/pdf', size: pdf.length, sha256: await sha256Hex(pdf) });
  const normalizedCase = {
    id: bundle.case.id,
    fraudType: bundle.case.fraud_type,
    channel: bundle.case.channel,
    amount: bundle.case.amount,
    occurredAt: bundle.case.occurred_at,
    reference: bundle.case.reference,
    institution: bundle.case.bank,
    recipient: bundle.case.recipient,
    narrative: bundle.case.narrative_input,
    complaintEn: bundle.case.complaint_en,
    workspaceStartedAt: bundle.case.created_at,
  };
  const normalizedChronology = bundle.chronology.map((item) => ({
    occurredAt: item.occurred_at,
    eventType: item.event_type,
    descriptionEn: item.description_en,
    source: item.source,
    position: item.position,
  }));
  const passportRecord = strToU8(JSON.stringify({
    format: 'FIRST30-evidence-passport',
    version: 2,
    case: normalizedCase,
    chronology: normalizedChronology,
    passport: bundle.passport,
    observations: bundle.observations,
    resolutions: bundle.resolutions,
    findings: bundle.findings.map((item) => ({ ruleCode: item.rule_code, status: item.status, detail: item.detail_en, evidenceIds: JSON.parse(String(item.evidence_ids_json || '[]')), acknowledgementNote: item.acknowledgement_note, acknowledgedAt: item.acknowledged_at })),
    custody: bundle.custody.filter((item) => ['added', 'analysed', 'removed'].includes(String(item.action))).map((item) => ({ evidenceId: item.evidence_id, action: item.action, detail: item.detail, createdAt: item.created_at })),
    evidence: bundle.evidence.map((item) => ({ id: item.id, kind: item.kind, filename: item.filename, mimeType: item.mime_type, size: item.size, isSample: item.is_sample, sha256: item.sha256, confirmedAt: item.confirmed_at, createdAt: item.created_at })),
  }, null, 2));
  files['passport.json'] = passportRecord; manifestFiles.push({ path: 'passport.json', mimeType: 'application/json', size: passportRecord.length, sha256: await sha256Hex(passportRecord) });
  const caseFingerprint = await sha256Hex(stableJson({
    documentTemplateVersion: 4,
    case: { id: bundle.case.id, fraudType: bundle.case.fraud_type, channel: bundle.case.channel, amount: bundle.case.amount, occurredAt: bundle.case.occurred_at, reference: bundle.case.reference, bank: bundle.case.bank, recipient: bundle.case.recipient, narrative: bundle.case.narrative_input, complaint: bundle.case.complaint_en },
    evidence: bundle.evidence.map((item) => ({ id: item.id, filename: item.filename, mimeType: item.mime_type, size: item.size, sha256: item.sha256, confirmedAt: item.confirmed_at })),
    chronology: bundle.chronology.map((item) => ({ occurredAt: item.occurred_at, eventType: item.event_type, description: item.description_en, source: item.source, position: item.position })),
    observations: bundle.observations,
    resolutions: bundle.resolutions,
    findings: bundle.findings.map((item) => ({ ruleCode: item.rule_code, status: item.status, detailEn: item.detail_en, acknowledgementNote: item.acknowledgement_note, acknowledgedAt: item.acknowledged_at })),
  }));
  const core = { format: 'FIRST30-evidence-passport' as const, formatVersion: 2 as const, caseId, createdAt: Date.now(), caseFingerprint, files: manifestFiles };
  const result = await api<{ manifest?: Record<string, unknown>; error?: string }>(`/api/cases/${caseId}/exports`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(core) });
  if (!result.manifest) throw new Error(result.error || 'Could not prepare the complete report. Please try again.');
  files['manifest.json'] = strToU8(JSON.stringify(result.manifest, null, 2));
  const zip = zipSync(files, { level: 6 });
  const ownedZip = new Uint8Array(zip.byteLength); ownedZip.set(zip);
  const blob = new Blob([ownedZip.buffer], { type: 'application/zip' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  const filename = `FIRST30-complete-report-${String(result.manifest.verificationCode)}.zip`;
  anchor.href = url; anchor.download = filename; anchor.hidden = true; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  return { manifest: result.manifest, downloadUrl: url, filename };
}
