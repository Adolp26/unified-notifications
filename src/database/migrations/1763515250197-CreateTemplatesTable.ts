import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateTemplatesTable1763515250197 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'templates',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'channel',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'subject',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'body',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'variables',
                        type: 'jsonb',
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
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
            }),
            true
        );

        // Criar índices para performance
        await queryRunner.createIndex(
            'templates',
            new TableIndex({
                name: 'IDX_templates_name',
                columnNames: ['name'],
            })
        );

        await queryRunner.createIndex(
            'templates',
            new TableIndex({
                name: 'IDX_templates_channel',
                columnNames: ['channel'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('templates', 'IDX_templates_channel');
        await queryRunner.dropIndex('templates', 'IDX_templates_name');
        await queryRunner.dropTable('templates');
    }

}
