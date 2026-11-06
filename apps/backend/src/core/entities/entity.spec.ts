import { describe, expect, it } from 'vitest';
import { Entity } from './entity.ts';
import { UniqueEntityID } from './unique-entity-id.ts';

class ExampleEntity extends Entity<{ name: string }> {
  static create(name: string, id?: UniqueEntityID) {
    return new ExampleEntity({ name }, id);
  }
}

describe('Entity equality', () => {
  it('recognizes an entity reconstituted with the same identity', () => {
    const original = ExampleEntity.create(
      'Before',
      new UniqueEntityID('same-id'),
    );
    const reconstituted = ExampleEntity.create(
      'After',
      new UniqueEntityID('same-id'),
    );

    expect(original.equals(original)).toBe(true);
    expect(original.equals(reconstituted)).toBe(true);
    expect(reconstituted.equals(original)).toBe(true);
  });

  it('distinguishes entities with different identities and equal properties', () => {
    const first = ExampleEntity.create('Same', new UniqueEntityID('first'));
    const second = ExampleEntity.create('Same', new UniqueEntityID('second'));

    expect(first.equals(second)).toBe(false);
  });
});
