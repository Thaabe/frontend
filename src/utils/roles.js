export const roles = [
  { label: "Student", value: "student" },
  { label: "Lecturer", value: "lecturer" },
  { label: "Principal Lecturer", value: "principal_lecturer" },
  { label: "Program Leader", value: "program_leader" }
];

export const roleLabels = roles.reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {});
