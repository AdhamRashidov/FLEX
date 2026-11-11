import type { Request, Response } from 'express';
import { ImportService } from './import.service.js';
import { ValidationError } from '../../common/errors/index.js';
import { z } from 'zod';

const excelImportSchema = z.object({
  fileBase64: z.string().min(1, 'Fayl ma\'lumoti (base64) kiritilishi shart'),
  filename: z.string().default('products.xlsx'),
});

const telegramPostParseSchema = z.object({
  text: z.string().min(1, 'Post matni kiritilishi shart'),
});

export class ImportController {
  private importService: ImportService;

  constructor() {
    this.importService = new ImportService();
  }

  private parseId(param: string | string[] | undefined): number {
    const val = Array.isArray(param) ? param[0] : param;
    const id = Number(val);
    if (!val || isNaN(id) || id <= 0) {
      throw new ValidationError('ID to\'g\'ri musbat son bo\'lishi kerak');
    }
    return id;
  }

  /**
   * POST /api/v1/store/import/excel
   * Excel yoki CSV fayldan tovarlarni ommaviy yuklash
   */
  importExcel = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const { fileBase64, filename } = excelImportSchema.parse(req.body);

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length === 0) {
      throw new ValidationError('Fayl bo\'sh');
    }

    const summary = await this.importService.importExcelOrCsv(storeId, buffer, filename);

    res.json({
      success: true,
      data: summary,
    });
  };

  /**
   * POST /api/v1/store/import/telegram/parse
   * Telegram kanal post matnidan AI orqali tovar parametrlarini ajratish
   */
  parseTelegramPost = async (req: Request, res: Response): Promise<void> => {
    const { text } = telegramPostParseSchema.parse(req.body);

    const parsed = await this.importService.parseTelegramPostWithAi(text);

    res.json({
      success: true,
      data: parsed,
    });
  };

  /**
   * GET /api/v1/store/import/jobs
   * Do'konning import amallari tarixi
   */
  getJobs = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const jobs = await this.importService.getImportJobs(storeId);

    res.json({
      success: true,
      data: jobs,
    });
  };

  /**
   * GET /api/v1/store/import/jobs/:id
   * Bitta import amali tafsiloti
   */
  getJobById = async (req: Request, res: Response): Promise<void> => {
    const storeId = req.storeId!;
    const jobId = this.parseId(req.params.id);

    const job = await this.importService.getImportJobById(storeId, jobId);

    res.json({
      success: true,
      data: job,
    });
  };
}
