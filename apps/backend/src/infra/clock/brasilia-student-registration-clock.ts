import { Injectable } from '@nestjs/common';
import { StudentRegistrationClock } from '../../domain/students/application/services/student-registration-clock.ts';

@Injectable()
export class BrasiliaStudentRegistrationClock extends StudentRegistrationClock {
  today(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) =>
      parts.find((part) => part.type === type)?.value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
}
