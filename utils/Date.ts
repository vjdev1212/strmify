export function formatDate(dateString: string): string {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return '';
    }

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

export function getYear(dateString: string): string {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return '';
    }

    return date.getFullYear().toString();
}

