import React from 'react';
import { Card, Table } from 'antd';
import type { TableProps } from 'antd';

type ListGridProps<T extends object> = TableProps<T> & {
  title?: React.ReactNode;
};

function ListGrid<T extends object>({ title, ...tableProps }: ListGridProps<T>) {
  return (
    <Card title={title}>
      <Table {...tableProps} />
    </Card>
  );
}

export default ListGrid;

