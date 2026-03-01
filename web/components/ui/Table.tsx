export function Table({ columns, children }: { columns: string[], children: React.ReactNode }) {
  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}