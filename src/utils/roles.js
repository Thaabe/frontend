export const roles = [
  { label: "Student", value: "student" },
  { label: "Lecturer", value: "lecturer" },
  { label: "Principal Lecturer", value: "principal_lecturer" },
  { label: "Program Leader", value: "program_leader" }
];

export const roleLabels = {};

for (let index = 0; index < roles.length; index += 1) {
  const role = roles[index];
  roleLabels[role.value] = role.label;
}
