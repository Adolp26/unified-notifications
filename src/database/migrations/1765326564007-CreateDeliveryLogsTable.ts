import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDeliveryLogsTable1765326564007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'delivery_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'notification_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'channel',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'response',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempt',
            type: 'int',
            default: 1,
          },
          {
            name: 'duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    await queryRunner.createIndex(
      'delivery_logs',
      new TableIndex({
        name: 'IDX_delivery_logs_notification',
        columnNames: ['notification_id'],
      })
    );

    await queryRunner.createIndex(
      'delivery_logs',
      new TableIndex({
        name: 'IDX_delivery_logs_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'delivery_logs',
      new TableIndex({
        name: 'IDX_delivery_logs_channel',
        columnNames: ['channel'],
      })
    );

    await queryRunner.createIndex(
      'delivery_logs',
      new TableIndex({
        name: 'IDX_delivery_logs_created',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createForeignKey(
      'delivery_logs',
      new TableForeignKey({
        columnNames: ['notification_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'notifications',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('delivery_logs');
  }
}