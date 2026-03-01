import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { DatabaseService, PaginatedResult } from '../../database/db.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { ListCertificatesDto } from './dto/list-certificates.dto';
import {
  CertificateRow,
  CertificateViewRow,
  Certificate,
} from './interfaces/certificates.interfaces';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly db: DatabaseService) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async createCertificate(
    staffId: string,
    dto: CreateCertificateDto,
  ): Promise<Certificate> {
    // Verify visit exists
    const visit = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM patient_visits WHERE id = $1`,
      [dto.visitId],
    );
    if (!visit) throw new NotFoundException(`Visit '${dto.visitId}' not found`);

    // Enforce one certificate per visit
    const existing = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM medical_certificates WHERE visit_id = $1`,
      [dto.visitId],
    );
    if (existing) {
      throw new ConflictException(
        `A certificate already exists for visit '${dto.visitId}'.`,
      );
    }

    // Generate sequential number inside a locked transaction to prevent duplicates
    const row = await this.db.transaction(async (client) => {
      // Table-level lock: only one INSERT at a time, preventing duplicate numbers
      await client.query(
        `LOCK TABLE medical_certificates IN SHARE ROW EXCLUSIVE MODE`,
      );

      // Build next certificate number: CERT-YYYY-NNNNNN (Asia/Bangkok timezone)
      const numResult = await client.query<{ cert_number: string }>(
        `SELECT CONCAT(
           'CERT-',
           TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'YYYY'),
           '-',
           LPAD(
             CAST(
               COALESCE(
                 MAX(CAST(SPLIT_PART(certificate_number, '-', 3) AS INT)),
                 0
               ) + 1 AS TEXT
             ),
             6, '0'
           )
         ) AS cert_number
         FROM medical_certificates
         WHERE certificate_number LIKE
           CONCAT('CERT-', TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'YYYY'), '-%')`,
      );

      const certNumber = numResult.rows[0].cert_number;

      const result = await client.query<CertificateRow>(
        `INSERT INTO medical_certificates
           (visit_id, certificate_number, diagnosis_text, recommendation, rest_days, rest_start_date, rest_end_date, issued_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          dto.visitId,
          certNumber,
          dto.diagnosisText,
          dto.recommendation ?? null,
          dto.restDays ?? null,
          dto.restStartDate ?? null,
          dto.restEndDate ?? null,
          staffId,
        ],
      );

      return result.rows[0];
    });

    this.logger.log(
      `Certificate created: ${row.certificate_number} visit=${dto.visitId} staff=${staffId}`,
    );

    return this.getById(row.id, staffId, 'staff');
  }

  // ── List ─────────────────────────────────────────────────────────────────────

  async listCertificates(
    dto: ListCertificatesDto,
    callerId: string,
    callerRole: string,
  ): Promise<PaginatedResult<Certificate>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    // Students see only their own certificates (patient_id comes from the view)
    if (callerRole === 'student') {
      conditions.push(`vc.patient_id = $${idx++}`);
      values.push(callerId);
    } else if (dto.patientId) {
      conditions.push(`vc.patient_id = $${idx++}`);
      values.push(dto.patientId);
    }

    if (dto.visitId) {
      conditions.push(`vc.visit_id = $${idx++}`);
      values.push(dto.visitId);
    }

    if (dto.from) {
      conditions.push(`vc.issued_at >= $${idx++}`);
      values.push(dto.from);
    }

    if (dto.to) {
      conditions.push(`vc.issued_at <= $${idx++}`);
      values.push(dto.to);
    }

    if (dto.search) {
      conditions.push(
        `(vc.certificate_number ILIKE $${idx} OR vc.patient_name ILIKE $${idx})`,
      );
      values.push(`%${dto.search}%`);
      idx++;
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      issued_at: 'vc.issued_at',
      certificate_number: 'vc.certificate_number',
    };
    const sortCol =
      allowedSort[dto.sortBy ?? 'issued_at'] ?? 'vc.issued_at';
    const sortDir = dto.order === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) FROM v_medical_certificates vc ${where}`;
    const dataSql = `
      SELECT vc.*
      FROM v_medical_certificates vc
      ${where}
      ORDER BY ${sortCol} ${sortDir}
    `;

    const result = await this.db.queryPaginated<CertificateViewRow>(
      countSql,
      dataSql,
      values,
      { page: dto.page, limit: dto.limit },
    );

    return {
      ...result,
      data: result.data.map((row) => this.formatCertificate(row)),
    };
  }

  // ── Get detail ───────────────────────────────────────────────────────────────

  async getById(
    id: string,
    callerId: string,
    callerRole: string,
  ): Promise<Certificate> {
    const row = await this.db.queryOne<CertificateViewRow>(
      `SELECT vc.* FROM v_medical_certificates vc WHERE vc.id = $1`,
      [id],
    );

    if (!row) throw new NotFoundException(`Certificate '${id}' not found`);

    if (callerRole === 'student' && row.patient_id !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatCertificate(row);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────────

  async generatePdf(
    id: string,
    callerId: string,
    callerRole: string,
  ): Promise<{ certificateNumber: string; buffer: Buffer }> {
    const cert = await this.getById(id, callerId, callerRole);
    const buffer = await this.buildPdf(cert);
    return { certificateNumber: cert.certificateNumber, buffer };
  }

  private buildPdf(cert: Certificate): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 60 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const issuedDate = new Date(cert.issuedAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Bangkok',
      });

      // Header
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('RAJAMANGALA UNIVERSITY OF TECHNOLOGY SRIVIJAYA', {
          align: 'center',
        });
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('University Infirmary', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('MEDICAL CERTIFICATE', { align: 'center', underline: true });
      doc.moveDown(1);
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .stroke();
      doc.moveDown(0.8);

      // Certificate meta
      doc.font('Helvetica').fontSize(11);
      this.pdfRow(doc, 'Certificate No.', cert.certificateNumber);
      this.pdfRow(doc, 'Date of Issue', issuedDate);
      doc.moveDown(0.8);

      // Patient info
      doc
        .font('Helvetica-Bold')
        .text('PATIENT INFORMATION')
        .font('Helvetica');
      doc.moveDown(0.3);
      this.pdfRow(
        doc,
        'Name',
        `${cert.patient.firstName} ${cert.patient.lastName}`,
      );
      if (cert.patient.studentId) {
        this.pdfRow(doc, 'Student ID', cert.patient.studentId);
      }
      this.pdfRow(doc, 'Email', cert.patient.email);
      doc.moveDown(0.8);

      // Diagnosis
      doc
        .font('Helvetica-Bold')
        .text('DIAGNOSIS / FINDINGS')
        .font('Helvetica');
      doc.moveDown(0.3);
      doc.fontSize(11).text(cert.diagnosisText, { indent: 20, lineGap: 3 });
      doc.moveDown(0.8);

      // Rest recommendation
      if (cert.restDays != null) {
        doc
          .font('Helvetica-Bold')
          .text('REST RECOMMENDATION')
          .font('Helvetica');
        doc.moveDown(0.3);
        const restText =
          cert.restDays === 0
            ? 'No rest required. Patient may continue normal activities.'
            : `The patient is recommended to rest for ${cert.restDays} day(s).`;
        doc.fontSize(11).text(restText, { indent: 20 });
        doc.moveDown(0.8);
      }

      // Footer divider
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .stroke();
      doc.moveDown(2);

      // Signature
      doc
        .font('Helvetica')
        .fontSize(11)
        .text('_________________________', { align: 'right' });
      doc.text(
        `${cert.issuedBy.firstName} ${cert.issuedBy.lastName}`,
        { align: 'right' },
      );
      doc.text('University Infirmary Staff', { align: 'right' });
      doc.text(
        'Rajamangala University of Technology Srivijaya',
        { align: 'right' },
      );
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#888888')
        .text(
          'This document is computer-generated and valid without physical signature.',
          { align: 'center' },
        );

      doc.end();
    });
  }

  /** Renders one "Label: value" line */
  private pdfRow(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
  ): void {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(value);
  }

  // ── Formatter ─────────────────────────────────────────────────────────────────

  private formatCertificate(row: CertificateViewRow): Certificate {
    const [patientFirst = '', ...patientRest] = (row.patient_name ?? '').split(' ');
    const patientLast = patientRest.join(' ');
    const [issuerFirst = '', ...issuerRest] = (row.issued_by_name ?? '').split(' ');
    const issuerLast = issuerRest.join(' ');
    return {
      id: row.id,
      visitId: row.visit_id,
      certificateNumber: row.certificate_number,
      diagnosisText: row.diagnosis_text,
      restDays: row.rest_days,
      issuedAt: row.issued_at,
      issuedBy: {
        id: row.issued_by,
        firstName: issuerFirst,
        lastName: issuerLast,
      },
      patient: {
        id: row.patient_id,
        firstName: patientFirst,
        lastName: patientLast,
        studentId: row.student_id,
        email: '',
      },
    };
  }
}
