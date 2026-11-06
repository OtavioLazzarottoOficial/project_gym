import { Injectable } from '@nestjs/common';
@Injectable()
export abstract class StudentRegistrationClock {
  // Calendar date in the chosen business timezone; infrastructure determines the timezone.
  abstract today(): string;
}
