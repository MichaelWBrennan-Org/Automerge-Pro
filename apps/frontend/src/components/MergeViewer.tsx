import React from 'react';

export function MergeViewer({ data }: { data: any }) {
  if (!data) return <div>Loading…</div>;
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Merge Dry-Run Result</h2>
      <div className="mt-2 text-sm">Success: {String(data.success)}</div>
      <div className="mt-2">
        <h3 className="font-medium">Decisions</h3>
        <ul className="list-disc pl-5">
          {(data.decisions || []).map((d: any) => (
            <li key={d.path}>
              <span className="font-mono">{d.path}</span> — strategy: {d.strategy}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

