import React from 'react';

export const SampleOutput: React.FC<{ title?: string, lines?: string[] }> = ({ title = 'Sample Output', lines = [] }) => {
  return (
    <div className="bg-card p-4 rounded-lg border border-border">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="text-sm text-muted-foreground space-y-2">
        {lines.length === 0 ? (
          <p>No output available. Run analysis to generate results.</p>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="p-2 bg-muted/50 rounded">
              <pre className="whitespace-pre-wrap text-xs">{l}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SampleOutput;
