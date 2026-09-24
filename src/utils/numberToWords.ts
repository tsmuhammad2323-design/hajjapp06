// Функция для преобразования числа в пропись (рубли)
export function numberToWords(num: number): string {
  if (num === 0) return 'ноль рублей 00 копеек';
  
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  
  const thousands = ['', 'тысяча', 'тысячи', 'тысяч'];
  const millions = ['', 'миллион', 'миллиона', 'миллионов'];
  const billions = ['', 'миллиард', 'миллиарда', 'миллиардов'];
  
  const rubles = ['', 'рубль', 'рубля', 'рублей'];
  const kopecks = ['', 'копейка', 'копейки', 'копеек'];
  
  function getPlural(n: number, forms: string[]): string {
    const abs = Math.abs(n) % 100;
    const n1 = abs % 10;
    
    if (abs > 10 && abs < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }
  
  function convertHundreds(n: number, isFemale: boolean): string {
    let result = '';
    
    const h = Math.floor(n / 100);
    if (h > 0) result += hundreds[h] + ' ';
    
    const rest = n % 100;
    if (rest < 10) {
      if (isFemale) {
        if (rest === 1) result += 'одна ';
        else if (rest === 2) result += 'две ';
        else if (rest > 0) result += units[rest] + ' ';
      } else {
        if (rest > 0) result += units[rest] + ' ';
      }
    } else if (rest < 20) {
      result += teens[rest - 10] + ' ';
    } else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      result += tens[t] + ' ';
      if (u > 0) {
        if (isFemale) {
          if (u === 1) result += 'одна ';
          else if (u === 2) result += 'две ';
          else result += units[u] + ' ';
        } else {
          result += units[u] + ' ';
        }
      }
    }
    
    return result;
  }
  
  const rublesInt = Math.floor(num);
  const kopecksInt = Math.round((num - rublesInt) * 100);
  
  let result = '';
  
  // Миллиарды
  const billionsNum = Math.floor(rublesInt / 1000000000);
  if (billionsNum > 0) {
    result += convertHundreds(billionsNum, false) + getPlural(billionsNum, billions) + ' ';
  }
  
  // Миллионы
  const millionsNum = Math.floor((rublesInt % 1000000000) / 1000000);
  if (millionsNum > 0) {
    result += convertHundreds(millionsNum, false) + getPlural(millionsNum, millions) + ' ';
  }
  
  // Тысячи
  const thousandsNum = Math.floor((rublesInt % 1000000) / 1000);
  if (thousandsNum > 0) {
    result += convertHundreds(thousandsNum, true) + getPlural(thousandsNum, thousands) + ' ';
  }
  
  // Рубли
  const rublesNum = rublesInt % 1000;
  result += convertHundreds(rublesNum, false) + getPlural(rublesNum, rubles);
  
  // Копейки
  result += ' ' + (kopecksInt < 10 ? '0' + kopecksInt : kopecksInt) + ' ' + getPlural(kopecksInt, kopecks);
  
  // Первая буква заглавная
  return result.charAt(0).toUpperCase() + result.slice(1);
}
