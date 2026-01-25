import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { DataTable, Pagination, Column } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  email: string;
  status: string;
}

const testData: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', status: 'Active' },
  { id: '2', name: 'Bob', email: 'bob@example.com', status: 'Inactive' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', status: 'Active' },
];

const columns: Column<TestRow>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true },
  { id: 'email', header: 'Email', accessor: 'email' },
  { id: 'status', header: 'Status', accessor: 'status', sortable: true },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable data={testData} columns={columns} keyField="id" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable data={testData} columns={columns} keyField="id" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<DataTable data={[]} columns={columns} keyField="id" emptyMessage="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(<DataTable data={[]} columns={columns} keyField="id" loading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('sorts data when clicking sortable column', () => {
    render(<DataTable data={testData} columns={columns} keyField="id" />);

    // Click name column to sort ascending
    fireEvent.click(screen.getByText('Name'));

    const rows = screen.getAllByRole('row');
    // First row is header, so data rows start at index 1
    expect(rows[1]).toHaveTextContent('Alice');
    expect(rows[2]).toHaveTextContent('Bob');
    expect(rows[3]).toHaveTextContent('Charlie');

    // Click again to sort descending
    fireEvent.click(screen.getByText('Name'));

    const rowsAfterSecondClick = screen.getAllByRole('row');
    expect(rowsAfterSecondClick[1]).toHaveTextContent('Charlie');
    expect(rowsAfterSecondClick[2]).toHaveTextContent('Bob');
    expect(rowsAfterSecondClick[3]).toHaveTextContent('Alice');
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable data={testData} columns={columns} keyField="id" onRowClick={onRowClick} />);

    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('renders selectable checkboxes', () => {
    render(
      <DataTable
        data={testData}
        columns={columns}
        keyField="id"
        selectable
        selectedRows={[]}
        onSelectionChange={() => {}}
      />
    );

    // Header checkbox + 3 row checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(4);
  });

  it('handles row selection', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={columns}
        keyField="id"
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click first data row checkbox (index 1, since 0 is header)
    fireEvent.click(checkboxes[1]);

    expect(onSelectionChange).toHaveBeenCalledWith([testData[0]]);
  });

  it('handles select all', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={columns}
        keyField="id"
        selectable
        selectedRows={[]}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click header checkbox (index 0)
    fireEvent.click(checkboxes[0]);

    expect(onSelectionChange).toHaveBeenCalledWith(testData);
  });

  it('handles deselect all', () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={testData}
        columns={columns}
        keyField="id"
        selectable
        selectedRows={testData}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('renders row actions', () => {
    render(
      <DataTable
        data={testData}
        columns={columns}
        keyField="id"
        rowActions={(row) => <button data-testid={`action-${row.id}`}>Edit</button>}
      />
    );

    expect(screen.getByTestId('action-1')).toBeInTheDocument();
    expect(screen.getByTestId('action-2')).toBeInTheDocument();
    expect(screen.getByTestId('action-3')).toBeInTheDocument();
  });

  it('supports custom accessor functions', () => {
    const columnsWithAccessor: Column<TestRow>[] = [
      { id: 'name', header: 'Name', accessor: (row) => <strong>{row.name}</strong> },
    ];

    render(<DataTable data={testData} columns={columnsWithAccessor} keyField="id" />);

    expect(screen.getByText('Alice').tagName).toBe('STRONG');
  });
});

describe('Pagination', () => {
  it('renders pagination info', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Showing 1 to 10 of 50 results')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPageChange when clicking Previous', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByText('Previous'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange when clicking Next', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('renders page size selector when onPageSizeChange is provided', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('10 per page')).toBeInTheDocument();
  });

  it('calls onPageSizeChange when selecting different page size', () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '25' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('shows correct range for middle pages', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={50}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Showing 21 to 30 of 50 results')).toBeInTheDocument();
  });

  it('shows correct range for last page with fewer items', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalItems={47}
        pageSize={10}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Showing 41 to 47 of 47 results')).toBeInTheDocument();
  });
});
