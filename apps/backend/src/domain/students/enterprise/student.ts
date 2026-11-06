import { Entity } from '../../../core/entities/entity.ts';
import { left, right, type Either } from '../../../core/either.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { CpfObjectValue } from './value-objects/cpf-object-value.ts';
import { PhoneObjectValue } from './value-objects/phone-object-value.ts';
import type { InvalidCpfError } from './errors/invalid-cpf-error.ts';
import type { InvalidPhoneError } from './errors/invalid-phone-error.ts';
import { InvalidStudentError } from './errors/invalid-student-error.ts';

export interface StudentContactInput {
  name: string;
  phone: string;
  relationship: string;
}
export interface StudentAddressInput {
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}
export interface StudentInput {
  organizationId: UniqueEntityID;
  branchId: UniqueEntityID;
  userId: UniqueEntityID;
  cpf: string;
  phone: string;
  birthDate: string;
  address?: StudentAddressInput | null;
  emergencyContact?: StudentContactInput | null;
  guardian?: StudentContactInput | null;
}
export interface StudentContact {
  name: string;
  phone: PhoneObjectValue;
  relationship: string;
}
export interface StudentProps {
  organizationId: UniqueEntityID;
  branchId: UniqueEntityID;
  userId: UniqueEntityID;
  cpf: CpfObjectValue;
  phone: PhoneObjectValue;
  birthDate: string;
  address: StudentAddressInput | null;
  emergencyContact: StudentContact | null;
  guardian: StudentContact | null;
}
export type InvalidStudentData =
  InvalidCpfError | InvalidPhoneError | InvalidStudentError;

function validDate(value: string): boolean {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000-')
  ) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function filled(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function contact(
  input: StudentContactInput | null | undefined,
): Either<InvalidStudentError | InvalidPhoneError, StudentContact | null> {
  if (input === undefined || input === null) {
    return right(null);
  }

  if (!filled(input.name) || !filled(input.relationship)) {
    return left(new InvalidStudentError());
  }

  const phone = PhoneObjectValue.create(input.phone);

  if (phone.isLeft()) {
    return left(phone.value);
  }

  return right({
    name: input.name.trim(),
    phone: phone.value,
    relationship: input.relationship.trim(),
  });
}

export class Student extends Entity<StudentProps> {
  private constructor(props: StudentProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get organizationId() {
    return this.props.organizationId;
  }

  get branchId() {
    return this.props.branchId;
  }

  get userId() {
    return this.props.userId;
  }

  get cpf() {
    return this.props.cpf;
  }

  get phone() {
    return this.props.phone;
  }

  get birthDate() {
    return this.props.birthDate;
  }

  get address() {
    return this.props.address ? { ...this.props.address } : null;
  }

  get emergencyContact() {
    return this.props.emergencyContact
      ? { ...this.props.emergencyContact }
      : null;
  }

  get guardian() {
    return this.props.guardian ? { ...this.props.guardian } : null;
  }

  static create(
    input: StudentInput,
    today: string,
    id?: UniqueEntityID,
  ): Either<InvalidStudentData, Student> {
    if (
      !input.organizationId?.toString().trim() ||
      !input.branchId?.toString().trim() ||
      !input.userId?.toString().trim() ||
      !validDate(today) ||
      !validDate(input.birthDate) ||
      input.birthDate > today
    ) {
      return left(new InvalidStudentError());
    }

    const cpf = CpfObjectValue.create(input.cpf);
    if (cpf.isLeft()) {
      return left(cpf.value);
    }

    const phone = PhoneObjectValue.create(input.phone);

    if (phone.isLeft()) {
      return left(phone.value);
    }

    const emergencyContact = contact(input.emergencyContact);

    if (emergencyContact.isLeft()) {
      return left(emergencyContact.value);
    }

    const guardian = contact(input.guardian);

    if (guardian.isLeft()) {
      return left(guardian.value);
    }

    const age =
      Number(today.slice(0, 4)) -
      Number(input.birthDate.slice(0, 4)) -
      (today.slice(5) < input.birthDate.slice(5) ? 1 : 0);
    if (age < 18 && !guardian.value) {
      return left(new InvalidStudentError());
    }

    const address = input.address ?? null;

    if (
      address &&
      (!filled(address.postalCode) ||
        !filled(address.street) ||
        !filled(address.number) ||
        !filled(address.neighborhood) ||
        !filled(address.city) ||
        !filled(address.state) ||
        (address.complement !== undefined &&
          typeof address.complement !== 'string'))
    ) {
      return left(new InvalidStudentError());
    }

    return right(
      new Student(
        {
          organizationId: input.organizationId,
          branchId: input.branchId,
          userId: input.userId,
          cpf: cpf.value,
          phone: phone.value,
          birthDate: input.birthDate,
          address: address ? { ...address } : null,
          emergencyContact: emergencyContact.value,
          guardian: guardian.value,
        },
        id,
      ),
    );
  }
}
