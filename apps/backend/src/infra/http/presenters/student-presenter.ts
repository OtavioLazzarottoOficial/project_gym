import type { Student } from '../../../domain/students/enterprise/student.ts';

export class StudentPresenter {
  static toHTTP(student: Student) {
    const emergency = student.emergencyContact;
    const guardian = student.guardian;
    return {
      id: student.id.toString(),
      organization_id: student.organizationId.toString(),
      branch_id: student.branchId.toString(),
      user_id: student.userId.toString(),
      cpf: student.cpf.value,
      phone: student.phone.value,
      birth_date: student.birthDate,
      address: student.address,
      emergency_contact: emergency
        ? {
            name: emergency.name,
            phone: emergency.phone.value,
            relationship: emergency.relationship,
          }
        : null,
      guardian: guardian
        ? {
            name: guardian.name,
            phone: guardian.phone.value,
            relationship: guardian.relationship,
          }
        : null,
    };
  }
}
