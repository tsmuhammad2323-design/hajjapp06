import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Pilgrim } from '../types';
import { getLeader, getSystemSettings, formatCurrency } from '../store/database';

/**
 * Экспорт карточки паломника в PDF
 */
export function exportPilgrimToPDF(pilgrim: Pilgrim): void {
  const doc = new jsPDF();
  const settings = getSystemSettings();
  const leader = getLeader(pilgrim.leaderId);
  
  // Заголовок
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Карточка паломника', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let yPos = 40;
  
  // ФИО
  doc.setFont('helvetica', 'bold');
  doc.text('ФИО:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pilgrim.lastName} ${pilgrim.firstName} ${pilgrim.middleName}`, 60, yPos);
  yPos += 10;
  
  // Номер папки
  doc.setFont('helvetica', 'bold');
  doc.text('Номер папки:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(pilgrim.folderNumber || '—', 60, yPos);
  yPos += 10;
  
  // Телефон
  doc.setFont('helvetica', 'bold');
  doc.text('Телефон:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(pilgrim.phone || '—', 60, yPos);
  yPos += 10;
  
  // Дата рождения
  doc.setFont('helvetica', 'bold');
  doc.text('Дата рождения:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const birthDate = pilgrim.birthDate ? new Date(pilgrim.birthDate).toLocaleDateString('ru-RU') : '—';
  doc.text(birthDate, 60, yPos);
  yPos += 10;
  
  // Срок паспорта
  doc.setFont('helvetica', 'bold');
  doc.text('Срок паспорта:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const passportExpiry = pilgrim.passportExpiry ? new Date(pilgrim.passportExpiry).toLocaleDateString('ru-RU') : '—';
  doc.text(passportExpiry, 60, yPos);
  yPos += 10;
  
  // Руководитель
  doc.setFont('helvetica', 'bold');
  doc.text('Руководитель:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(leader?.fullName || '—', 60, yPos);
  yPos += 10;
  
  // Программа
  doc.setFont('helvetica', 'bold');
  doc.text('Программа:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const programName = pilgrim.programType === 'direct' 
    ? settings.programDirect.name 
    : settings.programEconomy.name;
  doc.text(programName, 60, yPos);
  yPos += 10;
  
  // Сумма
  doc.setFont('helvetica', 'bold');
  doc.text('Сумма:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(pilgrim.totalAmount), 60, yPos);
  yPos += 10;
  
  // Статус документов
  doc.setFont('helvetica', 'bold');
  doc.text('Документы:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const docStatus = pilgrim.documentStatus === 'complete' ? 'Полный комплект' : 'Неполный';
  doc.text(docStatus, 60, yPos);
  yPos += 10;
  
  // Статус оплаты
  doc.setFont('helvetica', 'bold');
  doc.text('Оплата:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const payStatus = pilgrim.paymentStatus === 'paid' ? 'Оплачено' 
    : pilgrim.paymentStatus === 'partial' ? 'Частично' 
    : 'Не оплачено';
  doc.text(payStatus, 60, yPos);
  yPos += 10;
  
  // Статус загрузки
  doc.setFont('helvetica', 'bold');
  doc.text('Загрузка:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  const uploadStatus = pilgrim.uploadStatus === 'main' ? 'Основа' 
    : pilgrim.uploadStatus === 'reserve' ? 'Резерв' 
    : '—';
  doc.text(uploadStatus, 60, yPos);
  yPos += 15;
  
  // Чекбоксы документов
  doc.setFont('helvetica', 'bold');
  doc.text('Наличие документов:', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Фото: ${pilgrim.hasPhoto ? '✓' : '✗'}`, 25, yPos);
  doc.text(`Паспорт: ${pilgrim.hasPassport ? '✓' : '✗'}`, 80, yPos);
  doc.text(`Прописка: ${pilgrim.hasRegistration ? '✓' : '✗'}`, 135, yPos);
  yPos += 8;
  doc.text(`Загранпаспорт: ${pilgrim.hasForeignPassport ? '✓' : '✗'}`, 25, yPos);
  yPos += 15;
  
  // Теги
  if (pilgrim.tags && pilgrim.tags.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Теги:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    const tags = pilgrim.tags.map(tagId => {
      const tag = settings.availableTags.find(t => t.id === tagId);
      return tag?.name || '';
    }).filter(Boolean).join(', ');
    doc.text(tags, 60, yPos);
    yPos += 10;
  }
  
  // Комментарии
  if (pilgrim.comments) {
    doc.setFont('helvetica', 'bold');
    doc.text('Комментарии:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitComments = doc.splitTextToSize(pilgrim.comments, 170);
    doc.text(splitComments, 20, yPos);
    yPos += splitComments.length * 5 + 5;
  }
  
  // Дополнительные комментарии
  if (pilgrim.additionalComments) {
    doc.setFont('helvetica', 'bold');
    doc.text('Дополнительные комментарии:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitAdditional = doc.splitTextToSize(pilgrim.additionalComments, 170);
    doc.text(splitAdditional, 20, yPos);
    yPos += splitAdditional.length * 5 + 5;
  }
  
  // Дата создания
  yPos = Math.max(yPos, 250);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const createdDate = new Date(pilgrim.createdAt).toLocaleDateString('ru-RU');
  doc.text(`Дата создания: ${createdDate}`, 20, yPos);
  
  // Сохранение
  const fileName = `${pilgrim.lastName}_${pilgrim.firstName}_${pilgrim.folderNumber || 'без_номера'}.pdf`;
  doc.save(fileName);
}

/**
 * Экспорт списка паломников в PDF
 */
export function exportPilgrimsListToPDF(pilgrims: Pilgrim[]): void {
  const doc = new jsPDF();
  const settings = getSystemSettings();
  
  // Заголовок
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Список паломников', 105, 20, { align: 'center' });
  
  // Дата экспорта
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const exportDate = new Date().toLocaleDateString('ru-RU');
  doc.text(`Дата экспорта: ${exportDate}`, 20, 30);
  doc.text(`Всего записей: ${pilgrims.length}`, 20, 36);
  
  // Таблица
  const tableData = pilgrims.map(p => {
    const leader = getLeader(p.leaderId);
    return [
      p.folderNumber || '—',
      `${p.lastName} ${p.firstName} ${p.middleName}`.trim(),
      p.phone || '—',
      leader?.fullName || '—',
      formatCurrency(p.totalAmount),
      p.documentStatus === 'complete' ? 'Полный' : 'Неполный',
      p.paymentStatus === 'paid' ? 'Оплачено' : p.paymentStatus === 'partial' ? 'Частично' : 'Не оплачено'
    ];
  });
  
  autoTable(doc, {
    head: [['Папка', 'ФИО', 'Телефон', 'Руководитель', 'Сумма', 'Документы', 'Оплата']],
    body: tableData,
    startY: 45,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 40 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 }
    }
  });
  
  // Сохранение
  const fileName = `список_паломников_${exportDate.replace(/\./g, '-')}.pdf`;
  doc.save(fileName);
}
