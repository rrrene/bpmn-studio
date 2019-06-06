export class DateService {

  private _date: Date;
  private _day: string;
  private _month: string;
  private _year: string;
  private _hour: string;
  private _minute: string;
  private _second: string;

  constructor(date: Date) {
    this._date = date;
  }

  public asFormattedDate(): string {
    return `${this._getDate()} ${this._getTime()}`;
  }

  public _getDate(): string {
    const dayIsSet: boolean = this._day !== undefined;
    const monthIsSet: boolean = this._month !== undefined;
    const yearIsSet: boolean = this._year !== undefined;

    let date: string = '';

    if (dayIsSet) {
      date += this._day;

      if (monthIsSet || yearIsSet) {
        date += '.';
      }
    }

    if (monthIsSet) {
      date += this._month;

      if (yearIsSet) {
        date += '.';
      }
    }

    if (yearIsSet) {
      date += this._year;
    }

    return date;
  }

  private _getTime(): string {
    const hourIsSet: boolean = this._hour !== undefined;
    const minuteIsSet: boolean = this._minute !== undefined;
    const secondIsSet: boolean = this._second !== undefined;

    let time: string = '';

    if (hourIsSet) {
      time += this._hour;

      if (minuteIsSet || secondIsSet) {
        time += ':';
      }
    }

    if (minuteIsSet) {
      time += this._minute;

      if (secondIsSet) {
        time += ':';
      }
    }

    if (secondIsSet) {
      time += this._second;
    }

    return time;
  }

  public day(): DateService {
    const day: string = `${this._date.getDate()}`;

    const dayIsOneChar: boolean = day.length === 1;

    this._day = dayIsOneChar ? `0${day}`
                             : day;

    return this;
  }

  public month(): DateService {
    const month: string = `${this._date.getMonth() + 1}`;

    const monthIsOneChar: boolean = month.length === 1;

    this._month = monthIsOneChar ? `0${month}`
                                 : month;

    return this;
  }

  public year(): DateService {
    const year: string = `${this._date.getFullYear()}`;

    this._year = year;

    return this;
  }

  public hours(): DateService {
    const hours: string = `${this._date.getHours()}`;

    const hourIsOneChar: boolean = hours.length === 1;

    this._hour = hourIsOneChar ? `0${hours}`
                               : hours;

    return this;
  }

  public minutes(): DateService {
    const minute: string = `${this._date.getMinutes()}`;

    const minuteIsOneChar: boolean = minute.length === 1;

    this._minute = minuteIsOneChar ? `0${minute}`
                                   : minute;

    return this;
  }

  public seconds(): DateService {
    const second: string = `${this._date.getSeconds()}`;

    const secondIsOneChar: boolean = second.length === 1;

    this._second = secondIsOneChar ? `0${second}`
                                   : second;

    return this;
  }
}
