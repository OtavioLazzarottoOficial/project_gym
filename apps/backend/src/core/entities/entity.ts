import { UniqueEntityID } from './unique-entity-id.ts';

export abstract class Entity<Props> {
  private _id: UniqueEntityID;
  protected props: Props;

  get id() {
    return this._id;
  }

  protected constructor(props: Props, id?: UniqueEntityID) {
    this.props = props;
    this._id = id ?? new UniqueEntityID();
  }

  public equals(entity: Entity<unknown>) {
    if (entity === this) {
      return true;
    }

    if (this._id.equals(entity.id)) {
      return true;
    }

    return false;
  }
}
