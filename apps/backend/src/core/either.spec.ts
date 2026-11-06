import { Either, left, right } from './either.ts';

function doSomeThing(shouldSuccess: boolean): Either<string, number> {
  if (shouldSuccess) {
    return right(10);
  } else {
    return left('error');
  }
}

// Wrap your tests in a describe block for better organization
describe('doSomeThing', () => {
  it('success result', () => {
    const result = doSomeThing(true);
    expect(result.isRight()).toBe(true);
    expect(result.isLeft()).toBe(false);
  });

  it('error result', () => {
    const result = doSomeThing(false);
    expect(result.isLeft()).toBe(true);
    expect(result.isRight()).toBe(false);
  });
});
