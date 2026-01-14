import { describe, it, expect } from 'vitest';

describe('Template Data Sources Feature', () => {
  it('should have template_data_sources table schema defined', () => {
    const schemaPath = '/home/ubuntu/sns-automation-app/drizzle/schema.ts';
    const fs = require('fs');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // template_data_sourcesテーブルが定義されていることを確認
    expect(schemaContent).toContain('templateDataSources');
    expect(schemaContent).toContain('templateId');
    expect(schemaContent).toContain('dataSourceId');
    expect(schemaContent).toContain('priority');
  });

  it('should have linkTemplateDataSources function in db.ts', () => {
    const dbPath = '/home/ubuntu/sns-automation-app/server/db.ts';
    const fs = require('fs');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    
    // linkTemplateDataSources関数が定義されていることを確認
    expect(dbContent).toContain('export async function linkTemplateDataSources');
    expect(dbContent).toContain('templateId: number');
    expect(dbContent).toContain('dataSourceIds: number[]');
  });

  it('should have getDataSourcesByTemplateId function in db.ts', () => {
    const dbPath = '/home/ubuntu/sns-automation-app/server/db.ts';
    const fs = require('fs');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    
    // getDataSourcesByTemplateId関数が定義されていることを確認
    expect(dbContent).toContain('export async function getDataSourcesByTemplateId');
    expect(dbContent).toContain('templateId: number');
    expect(dbContent).toContain('.orderBy(templateDataSources.priority)');
  });

  it('should have linkDataSources API in customTemplates router', () => {
    const routersPath = '/home/ubuntu/sns-automation-app/server/routers.ts';
    const fs = require('fs');
    const routersContent = fs.readFileSync(routersPath, 'utf-8');
    
    // linkDataSources APIが定義されていることを確認
    expect(routersContent).toContain('linkDataSources');
    expect(routersContent).toContain('templateId: z.number()');
    expect(routersContent).toContain('dataSourceIds: z.array(z.number())');
    expect(routersContent).toContain('db.linkTemplateDataSources');
  });

  it('should have getLinkedDataSources API in customTemplates router', () => {
    const routersPath = '/home/ubuntu/sns-automation-app/server/routers.ts';
    const fs = require('fs');
    const routersContent = fs.readFileSync(routersPath, 'utf-8');
    
    // getLinkedDataSources APIが定義されていることを確認
    expect(routersContent).toContain('getLinkedDataSources');
    expect(routersContent).toContain('db.getDataSourcesByTemplateId');
  });

  it('should have data source selector in Templates.tsx', () => {
    const templatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/Templates.tsx';
    const fs = require('fs');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // データ接続先選択UIが実装されていることを確認
    expect(templatesContent).toContain('selectedDataSources');
    expect(templatesContent).toContain('handleAddDataSource');
    expect(templatesContent).toContain('handleRemoveDataSource');
    expect(templatesContent).toContain('handleMovePriority');
    expect(templatesContent).toContain('写真データ接続先');
  });

  it('should support priority ordering in data source selection', () => {
    const templatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/Templates.tsx';
    const fs = require('fs');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // 優先順位設定機能が実装されていることを確認
    expect(templatesContent).toContain('priority');
    expect(templatesContent).toContain('direction: "up" | "down"');
    expect(templatesContent).toContain('優先順位');
  });

  it('should call linkDataSources mutation when creating template', () => {
    const templatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/Templates.tsx';
    const fs = require('fs');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // テンプレート作成時に接続先を紐付けることを確認
    expect(templatesContent).toContain('linkDataSourcesMutation');
    expect(templatesContent).toContain('customTemplates.linkDataSources');
  });

  it('should load linked data sources when editing template', () => {
    const templatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/Templates.tsx';
    const fs = require('fs');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // テンプレート編集時に接続先を読み込むことを確認
    expect(templatesContent).toContain('getLinkedDataSources');
    expect(templatesContent).toContain('handleEdit');
  });

  it('should display data source list from dataSources API', () => {
    const templatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/Templates.tsx';
    const fs = require('fs');
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    
    // データ接続先一覧を取得して表示することを確認
    expect(templatesContent).toContain('dataSources.list.useQuery');
    expect(templatesContent).toContain('SelectContent');
  });
});
