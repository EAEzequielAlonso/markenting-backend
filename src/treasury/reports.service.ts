import { Injectable } from '@nestjs/common';
import PptxGenJS = require('pptxgenjs');

@Injectable()
export class TreasuryReportsService {

    async generateMonthlyReport(churchName: string, transactions: any[], accounts: any[]) {
        const pres = new (PptxGenJS as any)();

        // 1. Title Slide
        let slide = pres.addSlide();
        slide.addText(`Reporte Financiero: ${churchName}`, { x: 1, y: 1, fontSize: 24, bold: true, color: '003366' });
        slide.addText(`Generado: ${new Date().toLocaleDateString()}`, { x: 1, y: 2, fontSize: 14, color: '888888' });

        // 2. Summary Slide
        slide = pres.addSlide();
        slide.addText('Resumen Financiero', { x: 0.5, y: 0.5, fontSize: 18, bold: true, color: '003366' });

        const totalIncome = transactions.filter(t => t.destinationAccount?.type === 'asset' && t.sourceAccount?.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const totalExpense = transactions.filter(t => t.sourceAccount?.type === 'asset' && t.destinationAccount?.type === 'expense')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        slide.addText(`Ingresos Totales: $${totalIncome.toFixed(2)}`, { x: 1, y: 1.5, fontSize: 16, color: '008800' });
        slide.addText(`Egresos Totales: $${totalExpense.toFixed(2)}`, { x: 1, y: 2.5, fontSize: 16, color: 'CC0000' });
        slide.addText(`Resultado Neto: $${(totalIncome - totalExpense).toFixed(2)}`, { x: 1, y: 3.5, fontSize: 16, bold: true });

        // 3. Accounts Status
        slide = pres.addSlide();
        slide.addText('Estado de Fondos', { x: 0.5, y: 0.5, fontSize: 18, bold: true, color: '003366' });

        let yPos = 1.5;
        accounts.filter(a => a.type === 'asset' || a.type === 'liability').forEach(acc => {
            slide.addText(`${acc.name}: $${Number(acc.balance || 0).toFixed(2)}`, { x: 1, y: yPos, fontSize: 14 });
            yPos += 0.5;
        });

        // Generate Buffer
        // Generate buffer as Uint8Array then convert to Buffer
        const buffer = await pres.write({ outputType: 'nodebuffer' } as any);
        return buffer as unknown as Buffer;
    }
}
