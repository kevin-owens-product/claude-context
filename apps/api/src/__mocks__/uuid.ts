// Mock uuid for Jest tests
let counter = 0;

export const v4 = () => {
  counter++;
  return `mock-uuid-${counter.toString().padStart(8, '0')}`;
};

export const validate = (uuid: string) => {
  return typeof uuid === 'string' && uuid.length > 0;
};

export const version = (uuid: string) => {
  return 4;
};

export default { v4, validate, version };
