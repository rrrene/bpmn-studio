import moment from 'moment';

export class DateService {
  public getBeautifiedDate(date: string | Date): string {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  }
}
