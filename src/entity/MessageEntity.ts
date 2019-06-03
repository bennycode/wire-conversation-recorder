import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class MessageEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number = 0;
  @Column()
  public contentBase64: string;
  @Column()
  public contentType: string;
  @Column()
  public conversationId: string;
  @Column({unique: true})
  public messageId: string;
  @Column()
  public sendingUserId: string;
  @Column()
  public sendingUserName: string;

  constructor() {
    super();
    this.contentBase64 = '';
    this.contentType = '';
    this.conversationId = '';
    this.messageId = '';
    this.sendingUserId = '';
    this.sendingUserName = '';
  }
}
