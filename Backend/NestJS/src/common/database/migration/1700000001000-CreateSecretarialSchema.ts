import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateSecretarialSchema1700000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create executives table
    await queryRunner.createTable(
      new Table({
        name: 'executives',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'department',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'tenant_id',
            type: 'int',
            isNullable: false,
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
      true,
    );

    // Create meetings table
    await queryRunner.createTable(
      new Table({
        name: 'meetings',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'start_time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'end_time',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: `'medium'`,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: `'scheduled'`,
          },
          {
            name: 'executive_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'organizer_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'int',
            isNullable: false,
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
      true,
    );

    // Create meeting_attendees junction table
    await queryRunner.createTable(
      new Table({
        name: 'meeting_attendees',
        columns: [
          {
            name: 'meeting_id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    // Create tasks table
    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: `'todo'`,
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: `'medium'`,
          },
          {
            name: 'due_date',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'estimated_hours',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'actual_hours',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'assignee_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'int',
            isNullable: false,
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
      true,
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'executives',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meetings',
      new TableForeignKey({
        columnNames: ['executive_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'executives',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meetings',
      new TableForeignKey({
        columnNames: ['organizer_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meetings',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meeting_attendees',
      new TableForeignKey({
        columnNames: ['meeting_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'meetings',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meeting_attendees',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['assignee_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    const tables = await queryRunner.getTables([
      'executives',
      'meetings',
      'meeting_attendees',
      'tasks',
    ]);

    for (const table of tables) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey(table.name, foreignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('tasks');
    await queryRunner.dropTable('meeting_attendees');
    await queryRunner.dropTable('meetings');
    await queryRunner.dropTable('executives');
  }
}