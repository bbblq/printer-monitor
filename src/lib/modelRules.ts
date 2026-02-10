import db from './db';

export type ModelRule = {
  id: number;
  name: string;
  brand?: string;
  model_pattern: string;
  priority: number;
  quirks: {
    invalid_value_mapping?: {
      some_remaining?: number;
      unknown?: number;
      other?: number;
    };
    use_private_mib?: boolean;
    private_mib_oid?: string;
    force_level_on_error?: {
      no_toner?: number;
      low_toner?: number;
    };
  };
  enabled: number;
  created_at: string;
  updated_at: string;
};

const DEFAULT_RULES: Omit<ModelRule, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Ricoh 通用规则',
    brand: 'ricoh',
    model_pattern: '*',
    priority: 10,
    quirks: {
      use_private_mib: true,
      private_mib_oid: '1.3.6.1.4.1.367.3.2.1.2.24.1.1',
    },
    enabled: 1,
  },
  {
    name: 'Canon LBP 通用规则',
    brand: 'canon',
    model_pattern: '*lbp*',
    priority: 10,
    quirks: {
      force_level_on_error: {
        no_toner: 0,
        low_toner: 100,
      },
    },
    enabled: 1,
  },
  {
    name: 'Canon Laser 通用规则',
    brand: 'canon',
    model_pattern: '*laser*',
    priority: 10,
    quirks: {
      force_level_on_error: {
        no_toner: 0,
        low_toner: 100,
      },
    },
    enabled: 1,
  },
];

export function initModelRulesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      model_pattern TEXT NOT NULL,
      priority INTEGER DEFAULT 10,
      quirks TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const count = (db.prepare('SELECT count(*) as c FROM model_rules').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO model_rules (name, brand, model_pattern, priority, quirks, enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rules) => {
      for (const r of rules) {
        insert.run(r.name, r.brand || null, r.model_pattern, r.priority, JSON.stringify(r.quirks), r.enabled);
      }
    });
    insertMany(DEFAULT_RULES);
  }
}

export function getAllRules(): ModelRule[] {
  const rows = db.prepare('SELECT * FROM model_rules WHERE enabled = 1 ORDER BY priority DESC').all() as any[];
  return rows.map(r => ({
    ...r,
    quirks: JSON.parse(r.quirks),
  }));
}

export function getMatchingRule(sysDescr: string): ModelRule | null {
  const rules = db.prepare('SELECT * FROM model_rules WHERE enabled = 1 ORDER BY priority DESC').all() as any[];
  const lowerDescr = sysDescr.toLowerCase();

  for (const row of rules) {
    const quirks = JSON.parse(row.quirks);
    const { brand, model_pattern } = row;

    if (brand && !lowerDescr.includes(brand.toLowerCase())) {
      continue;
    }

    const pattern = model_pattern.toLowerCase();
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(lowerDescr)) {
        return { ...row, quirks };
      }
    } else if (lowerDescr.includes(pattern)) {
      return { ...row, quirks };
    }
  }
  return null;
}

export function addRule(rule: Omit<ModelRule, 'id' | 'created_at' | 'updated_at'>) {
  return db.prepare(`
    INSERT INTO model_rules (name, brand, model_pattern, priority, quirks, enabled)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    rule.name,
    rule.brand || null,
    rule.model_pattern,
    rule.priority,
    JSON.stringify(rule.quirks),
    rule.enabled
  );
}

export function updateRule(id: number, rule: Partial<Omit<ModelRule, 'id' | 'created_at' | 'updated_at'>>) {
  const updates: string[] = [];
  const values: any[] = [];

  if (rule.name !== undefined) { updates.push('name = ?'); values.push(rule.name); }
  if (rule.brand !== undefined) { updates.push('brand = ?'); values.push(rule.brand); }
  if (rule.model_pattern !== undefined) { updates.push('model_pattern = ?'); values.push(rule.model_pattern); }
  if (rule.priority !== undefined) { updates.push('priority = ?'); values.push(rule.priority); }
  if (rule.quirks !== undefined) { updates.push('quirks = ?'); values.push(JSON.stringify(rule.quirks)); }
  if (rule.enabled !== undefined) { updates.push('enabled = ?'); values.push(rule.enabled); }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  return db.prepare(`UPDATE model_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteRule(id: number) {
  return db.prepare('DELETE FROM model_rules WHERE id = ?').run(id);
}
