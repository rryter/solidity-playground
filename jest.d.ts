export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toEqBN(value: any): R;
    }
  }
}
