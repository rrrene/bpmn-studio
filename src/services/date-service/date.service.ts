import moment from 'moment';

export function getBeautifiedDate(date: string | Date): string {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
}
