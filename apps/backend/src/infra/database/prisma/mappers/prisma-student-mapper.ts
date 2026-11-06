import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import {
  Student,
  type StudentAddressInput,
  type StudentContactInput,
} from '../../../../domain/students/enterprise/student.ts';
import { InvalidPersistedStudentError } from '../../../errors/invalid-persisted-student-error.ts';
import type {
  Prisma,
  Student as PrismaStudent,
  User as PrismaUser,
} from '../generated/client.ts';

export class PrismaStudentMapper {
  static toPrisma(
    student: Student,
    membershipId: string,
  ): Prisma.StudentUncheckedCreateInput {
    const address = student.address;
    const emergency = student.emergencyContact;
    const guardian = student.guardian;

    return {
      id: student.id.toString(),
      membership_id: membershipId,
      organization_id: student.organizationId.toString(),
      branch_id: student.branchId.toString(),
      birth_date: new Date(`${student.birthDate}T00:00:00.000Z`),
      phone: student.phone.value,
      address_postal_code: address?.postalCode ?? null,
      address_street: address?.street ?? null,
      address_number: address?.number ?? null,
      address_neighborhood: address?.neighborhood ?? null,
      address_city: address?.city ?? null,
      address_state: address?.state ?? null,
      address_complement: address?.complement ?? null,
      emergency_name: emergency?.name ?? null,
      emergency_phone: emergency?.phone.value ?? null,
      emergency_relationship: emergency?.relationship ?? null,
      guardian_name: guardian?.name ?? null,
      guardian_phone: guardian?.phone.value ?? null,
      guardian_relationship: guardian?.relationship ?? null,
    };
  }

  static toDomain(
    raw: PrismaStudent,
    user: PrismaUser,
    today: string,
  ): Student {
    if (!user.cpf || !Number.isFinite(raw.birth_date.getTime())) {
      throw new InvalidPersistedStudentError();
    }

    const addressFields = [
      raw.address_postal_code,
      raw.address_street,
      raw.address_number,
      raw.address_neighborhood,
      raw.address_city,
      raw.address_state,
    ];
    const hasAddress =
      addressFields.some((value) => value !== null) ||
      raw.address_complement !== null;
    if (hasAddress && addressFields.some((value) => value === null)) {
      throw new InvalidPersistedStudentError();
    }

    const address: StudentAddressInput | null = hasAddress
      ? {
          postalCode: raw.address_postal_code!,
          street: raw.address_street!,
          number: raw.address_number!,
          neighborhood: raw.address_neighborhood!,
          city: raw.address_city!,
          state: raw.address_state!,
          ...(raw.address_complement !== null
            ? { complement: raw.address_complement }
            : {}),
        }
      : null;
    function contact(
      name: string | null,
      phone: string | null,
      relationship: string | null,
    ): StudentContactInput | null {
      if (name === null && phone === null && relationship === null) {
        return null;
      }

      if (name === null || phone === null || relationship === null) {
        throw new InvalidPersistedStudentError();
      }

      return { name, phone, relationship };
    }
    const result = Student.create(
      {
        organizationId: new UniqueEntityID(raw.organization_id),
        branchId: new UniqueEntityID(raw.branch_id),
        userId: new UniqueEntityID(user.id),
        cpf: user.cpf,
        phone: raw.phone,
        birthDate: raw.birth_date.toISOString().slice(0, 10),
        address,
        emergencyContact: contact(
          raw.emergency_name,
          raw.emergency_phone,
          raw.emergency_relationship,
        ),
        guardian: contact(
          raw.guardian_name,
          raw.guardian_phone,
          raw.guardian_relationship,
        ),
      },
      today,
      new UniqueEntityID(raw.id),
    );
    if (
      result.isLeft() ||
      result.value.cpf.value !== user.cpf ||
      result.value.phone.value !== raw.phone ||
      (result.value.guardian?.phone.value ?? null) !== raw.guardian_phone ||
      (result.value.emergencyContact?.phone.value ?? null) !==
        raw.emergency_phone
    ) {
      throw new InvalidPersistedStudentError();
    }

    return result.value;
  }
}
