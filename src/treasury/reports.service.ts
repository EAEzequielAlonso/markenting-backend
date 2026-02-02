import { Injectable } from '@nestjs/common';
import PptxGenJS = require('pptxgenjs');

@Injectable()
export class TreasuryReportsService {

    async generateMonthlyReport(churchName: string, transactions: any[], accounts: any[]) {
        const pres = new (PptxGenJS as any)();

        // --- Styles & Constants ---
        const colors = {
            primary: '003366',
            secondary: '0066CC',
            accent: 'E6B800',
            text: '333333',
            lightText: '666666',
            positive: '008800',
            negative: 'CC0000',
            bg: 'FFFFFF'
        };

        const titleStyle = { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 24, bold: true, color: colors.primary, align: 'center' };

        // --- Helpers ---
        const fmtMoney = (amount: number) => `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

        // --- Data Prep ---
        const totalIncome = transactions
            .filter(t => t.destinationAccount?.type === 'asset' && t.sourceAccount?.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const totalExpense = transactions
            .filter(t => t.sourceAccount?.type === 'asset' && t.destinationAccount?.type === 'expense')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const balance = totalIncome - totalExpense;

        // --- Slide 1: Cover ---
        let slide = pres.addSlide();
        // Background strip
        slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.5, fill: colors.primary });
        slide.addText('REPORTE FINANCIERO', { x: 0, y: 0.4, w: '100%', fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });

        slide.addText(churchName, { x: 0, y: 2.5, w: '100%', fontSize: 28, bold: true, color: colors.text, align: 'center' });
        slide.addText(`Generado el: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { x: 0, y: 3.2, w: '100%', fontSize: 16, color: colors.lightText, align: 'center' });

        // --- Slide 2: Executive Summary ---
        slide = pres.addSlide();
        slide.addText('Resumen Ejecutivo', { ...titleStyle, align: 'left' } as any);
        slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.1, w: '90%', h: 0, line: colors.primary, lineSize: 2 });

        // Metrics Cards (Simulated with Shapes & Text)
        const drawMetric = (label: string, value: number, color: string, x: number) => {
            slide.addShape(pres.ShapeType.rect, { x: x, y: 2, w: 2.5, h: 2, fill: 'F5F7FA', line: 'E0E0E0' });
            slide.addText(label, { x: x + 0.1, y: 2.2, w: 2.3, fontSize: 14, color: colors.lightText, align: 'center' });
            slide.addText(fmtMoney(value), { x: x + 0.1, y: 3, w: 2.3, fontSize: 24, bold: true, color: color, align: 'center' });
        };

        drawMetric('Ingresos Totales', totalIncome, colors.positive, 0.8);
        drawMetric('Egresos Totales', totalExpense, colors.negative, 3.8);
        drawMetric('Resultado Neto', balance, balance >= 0 ? colors.positive : colors.negative, 6.8);

        // --- Slide 3: Funds Status ---
        slide = pres.addSlide();
        slide.addText('Estado de Fondos (Activos)', { ...titleStyle, align: 'left' } as any);
        slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.1, w: '90%', h: 0, line: colors.primary, lineSize: 2 });

        const assetRows = accounts
            .filter(a => a.type === 'asset')
            .map(a => [a.name, a.currency || 'ARS', fmtMoney(a.balance)]);

        if (assetRows.length > 0) {
            slide.addTable([['Cuenta', 'Moneda', 'Saldo Actual'], ...assetRows], {
                x: 0.5,
                y: 1.5,
                w: 9,
                fill: { color: 'F9F9F9' },
                border: { pt: 1, color: 'DDDDDD' },
                fontFace: 'Arial',
                fontSize: 12,
                headerStyles: { fill: colors.primary, color: 'FFFFFF', bold: true }
            });
        } else {
            slide.addText('No hay cuentas de activo registradas.', { x: 1, y: 2, fontSize: 14, italic: true });
        }

        // --- Slide 4: Top Expenses ---
        slide = pres.addSlide();
        slide.addText('Gastos por Categoría (Top 5)', { ...titleStyle, align: 'left' } as any);
        slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.1, w: '90%', h: 0, line: colors.primary, lineSize: 2 });

        // Calc Logic
        const expBreakdown = transactions
            .filter(t => t.sourceAccount?.type === 'asset' && t.destinationAccount?.type === 'expense')
            .reduce((acc: any, t) => {
                const name = t.destinationAccount?.name || 'Varios';
                acc[name] = (acc[name] || 0) + Number(t.amount);
                return acc;
            }, {});

        const sortedExp = Object.entries(expBreakdown)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 10) // Top 10 rows
            .map(([name, val]: any) => [name, fmtMoney(val), `${((val / (totalExpense || 1)) * 100).toFixed(1)}%`]);

        if (sortedExp.length > 0) {
            slide.addTable([['Categoría', 'Monto', '% del Total'], ...sortedExp], {
                x: 0.5,
                y: 1.5,
                w: 9,
                fill: { color: 'F9F9F9' },
                border: { pt: 1, color: 'DDDDDD' },
                fontFace: 'Arial',
                fontSize: 12,
                headerStyles: { fill: colors.secondary, color: 'FFFFFF', bold: true }
            });
        }

        // --- Slide 5: Ministry Report ---
        // Filter transactions with ANY ministry attached
        const ministryTxs = transactions.filter(t => t.ministry);
        const ministries = [...new Set(ministryTxs.map(t => t.ministry.name))];

        if (ministries.length > 0) {
            slide = pres.addSlide();
            slide.addText('Ejecución por Ministerio', { ...titleStyle, align: 'left' } as any);
            slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.1, w: '90%', h: 0, line: colors.primary, lineSize: 2 });

            const minRows = ministries.map((mName: any) => {
                const mTxs = ministryTxs.filter(t => t.ministry.name === mName && t.sourceAccount?.type === 'asset' && t.destinationAccount?.type === 'expense');
                const mTotal = mTxs.reduce((acc, t) => acc + Number(t.amount), 0);
                return [mName, fmtMoney(mTotal), `${mTxs.length} movimientos`];
            });

            slide.addTable([['Ministerio', 'Total Gastado', 'Transacciones'], ...minRows], {
                x: 0.5,
                y: 1.5,
                w: 9,
                fill: { color: 'F9F9F9' },
                border: { pt: 1, color: 'DDDDDD' },
                fontFace: 'Arial',
                fontSize: 12,
                headerStyles: { fill: colors.accent, color: '333333', bold: true }
            });
        }


        // Generate Buffer
        const buffer = await pres.write({ outputType: 'nodebuffer' } as any);
        return buffer as unknown as Buffer;
    }
}
