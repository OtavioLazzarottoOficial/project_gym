import { describe, it, expect, vi } from 'vitest';
import { DomainEvent } from './domain-event.ts';
import { AggregateRoot } from '../entities/aggregate-root.ts';
import { DomainEvents } from './domain-events.ts';
import { UniqueEntityID } from '../entities/unique-entity-id.ts';

class CustomAggregateCreated implements DomainEvent {
  public ocurredAt: Date;
  private aggregate: CustomAggregate;

  constructor(aggregate: CustomAggregate) {
    this.aggregate = aggregate;
    this.ocurredAt = new Date();
  }

  public getAggregateId(): UniqueEntityID {
    return this.aggregate.id;
  }
}

class CustomAggregate extends AggregateRoot<null> {
  static create() {
    const aggregate = new CustomAggregate(null);

    aggregate.addDomainEvent(new CustomAggregateCreated(aggregate));

    return aggregate;
  }
}

describe('domain events', () => {
  it('should be able to dispatch and listen to events', async () => {
    await Promise.resolve(); // await next tick

    const callbackSpy = vi.fn();

    // Subscriber cadastrado
    DomainEvents.register(callbackSpy, CustomAggregateCreated.name);

    // Criando um agregado sem salvar
    const aggregate = CustomAggregate.create();

    // Assegurando que o evento foi criado mas não disparado
    expect(aggregate.domainEvents).toHaveLength(1);

    // Disparando os eventos
    DomainEvents.dispatchEventsForAggregate(aggregate.id);

    // O subscriber ouve o evento
    expect(callbackSpy).toHaveBeenCalled();

    expect(aggregate.domainEvents).toHaveLength(0);
  });
});
