/* fsaa/lib/snippets.mjs — canonical slice file templates.
   These mirror agents/add-module.md and the seeded canon of both starter
   templates: a generated slice = a full entity (index/types/api/slice with
   mock data + a real test) + a thin feature (index/ui/config with a real
   test) + a thin route file. Data access lives ONLY in the entity. */

export function entityFiles(name) {
  const Noun = camelUpper(name);
  return {
    "index.ts": entityIndex(name),
    "types.ts": entityTypes(Noun),
    "api.ts": entityApi(name, Noun),
    "slice.ts": entitySlice(name, Noun),
    [`__tests__/${name}.test.ts`]: entityTest(name, Noun),
  };
}

export function featureFiles(name, template) {
  const Title = pascal(name);
  return {
    "index.ts": featureIndex(name),
    [`ui/${Title}Overview.tsx`]: featureComponent(name, Title, template),
    [`config/${camelUpper(name)}Columns.tsx`]: featureColumns(name),
    [`__tests__/${name}.test.tsx`]: featureTest(name, template),
  };
}

/* ---------- entity ---------- */

function entityIndex(name) {
  return `export type { ${camelUpper(name)}Record } from './types';
export { get${camelUpper(name)}s } from './api';
export { selectOpen${camelUpper(name)}s, select${camelUpper(name)}Total } from './slice';
`;
}

function entityTypes(Noun) {
  return `export type ${Noun}Status = 'pending' | 'paid' | 'cancelled';

export type ${Noun}Record = {
  id: string;
  reference: string;
  projectName: string;
  amount: number;
  status: ${Noun}Status;
};
`;
}

function entityApi(name, Noun) {
  return `/* entities/${name} — data access. Swap for a real API without touching features. */

import type { ${Noun}Record } from './types';

export const ${name.toUpperCase().replace(/-/g, '_')}_RECORDS: ${Noun}Record[] = [
  { id: 'r1', reference: 'REF-2026-001', projectName: 'Core Banking Migration', amount: 18500, status: 'paid' },
  { id: 'r2', reference: 'REF-2026-002', projectName: 'Mobile App v2', amount: 6200, status: 'pending' },
  { id: 'r3', reference: 'REF-2026-003', projectName: 'Mobile App v2', amount: 12400, status: 'pending' },
  { id: 'r4', reference: 'REF-2026-004', projectName: 'Legacy CRM Sunset', amount: 3100, status: 'cancelled' },
];

export function get${Noun}s(): Promise<${Noun}Record[]> {
  return Promise.resolve(${name.toUpperCase().replace(/-/g, '_')}_RECORDS);
}
`;
}

function entitySlice(name, Noun) {
  return `/* entities/${name}/slice — business logic (no UI knowledge, fully testable). */

import type { ${Noun}Record } from './types';

export function selectOpen${Noun}s(records: ${Noun}Record[]) {
  return records.filter((record) => record.status !== 'cancelled');
}

export function select${Noun}Total(records: ${Noun}Record[]) {
  return records.reduce((sum, record) => sum + record.amount, 0);
}
`;
}

function entityTest(name, Noun) {
  return `import { describe, expect, it } from 'vitest';
import { get${Noun}s, selectOpen${Noun}s, select${Noun}Total } from '../index';

describe('entities/${name}', () => {
  it('returns records with valid ids, amounts and statuses', async () => {
    const records = await get${Noun}s();
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.id).toBeTruthy();
      expect(record.amount).toBeGreaterThan(0);
      expect(['pending', 'paid', 'cancelled'] as const).toContain(record.status);
    }
  });

  it('derives open records and total through the slice', async () => {
    const records = await get${Noun}s();
    expect(selectOpen${Noun}s(records).every((record) => record.status !== 'cancelled')).toBe(true);
    expect(select${Noun}Total(records)).toBe(records.reduce((sum, record) => sum + record.amount, 0));
  });
});
`;
}

/* ---------- feature ---------- */

function featureIndex(name) {
  return `export { ${pascal(name)}Overview } from './ui/${pascal(name)}Overview';
`;
}

function featureComponent(name, Title, template) {
  const entityImport = template === "vite"
    ? `import { get${pascal(name)}s, type ${camelUpper(name)}Record } from '@entities/${name}';`
    : `import { get${pascal(name)}s, type ${camelUpper(name)}Record } from '@entities/${name}';`;
  return `${template === "next" ? "'use client';\n\n" : ""}import { useEffect, useState } from 'react';
import { DataTable } from '@shared/ui/molecules/table/DataTable';
${entityImport}
import { ${name}Columns } from '../config/${camelUpper(name)}Columns';

/* features/${name}/ui/${Title}Overview — thin composition: entity data + config. */

export function ${Title}Overview() {
  const [records, setRecords] = useState<${camelUpper(name)}Record[] | null>(null);

  useEffect(() => {
    let alive = true;
    get${pascal(name)}s().then((data) => {
      if (alive) setRecords(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section>
      <h2>${Title}</h2>
      {records && <DataTable columns={${name}Columns} data={records} rowKey={(row) => row.id} />}
    </section>
  );
}
`;
}

function featureColumns(name) {
  const Noun = camelUpper(name);
  return `import type { Column } from '@shared/ui/molecules/table/DataTable';
import type { ${Noun}Record } from '@entities/${name}';

/* features/${name}/config — plain data of the scenario, no UI knowledge. */

export const ${name}Columns: Column<${Noun}Record>[] = [
  {
    header: 'Reference',
    render: (row) => <strong>{row.reference}</strong>,
  },
  {
    header: 'Project',
    render: (row) => row.projectName,
  },
  {
    header: 'Amount',
    align: 'right',
    render: (row) => \`$\${row.amount.toLocaleString('en-US')}\`,
  },
  {
    header: 'Status',
    render: (row) =>
      row.status === 'paid' ? '✅ paid' : row.status === 'pending' ? '⏳ pending' : '❌ cancelled',
  },
];
`;
}

function featureTest(name, template) {
  return `import { describe, it, expect } from 'vitest';
import { ${pascal(name)}Overview } from '../index';
import { ${name}Columns } from '../config/${camelUpper(name)}Columns';
import type { ${camelUpper(name)}Record } from '@entities/${name}';

/* Scenario slice test: the component exists and the plain column config
   renders a record. Pure logic — no jsdom needed. */

const record: ${camelUpper(name)}Record = {
  id: 'r1',
  reference: 'REF-2026-001',
  projectName: 'Demo',
  amount: 100,
  status: 'pending',
};

describe('features/${name}', () => {
  it('exports the scenario component', () => {
    expect(typeof ${pascal(name)}Overview).toBe('function');
  });

  it('renders records through the plain column config', () => {
    expect(${name}Columns.length).toBeGreaterThan(0);
    for (const column of ${name}Columns) {
      expect(column.render(record)).toBeTruthy();
    }
    expect(String(${name}Columns[1].render(record))).toBe(record.projectName);
  });
});
`;
}

/* ---------- shared helpers ---------- */

export function pascal(name) {
  return name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
}

function camelUpper(name) {
  return pascal(name);
}