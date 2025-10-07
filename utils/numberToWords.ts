const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const thousands = ['', 'thousand', 'million', 'billion'];

function convertGroupToWords(n: number): string {
    if (n === 0) return '';
    
    let words = '';
    
    if (n >= 100) {
        words += ones[Math.floor(n / 100)] + ' hundred';
        n %= 100;
        if (n > 0) words += ' ';
    }

    if (n > 0) {
        if (n < 10) {
            words += ones[n];
        } else if (n < 20) {
            words += teens[n - 10];
        } else {
            words += tens[Math.floor(n / 10)];
            if (n % 10 > 0) {
                words += ' ' + ones[n % 10];
            }
        }
    }
    return words;
}

function numberToWords(num: any): string {
    if (typeof num !== 'number' || isNaN(num) || num === null || num === undefined) {
        return 'Zero and 00/100.-';
    }

    if (num === 0) return 'Zero and 00/100.-';

    const integerPart = Math.floor(num);
    const cents = Math.round((num - integerPart) * 100).toString().padStart(2, '0');

    if (integerPart === 0) {
        return `Zero and ${cents}/100.-`;
    }

    const numStr = integerPart.toString();
    const groups = [];
    for (let i = numStr.length; i > 0; i -= 3) {
        groups.push(parseInt(numStr.substring(Math.max(0, i - 3), i)));
    }

    const words = groups
        .map((group, i) => {
            if (group === 0) return '';
            return convertGroupToWords(group) + (i > 0 ? ' ' + thousands[i] : '');
        })
        .filter(g => g)
        .reverse()
        .join(' ');
    
    const finalWords = words.charAt(0).toUpperCase() + words.slice(1);

    return `${finalWords} and ${cents}/100.-`;
}

export default numberToWords;
