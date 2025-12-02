import { describe, it, expect } from 'vitest';

describe('Post Templates Feature', () => {
  it('should have post_templates table schema defined', () => {
    // スキーマファイルを読み込んで確認
    const schemaPath = '/home/ubuntu/sns-automation-app/drizzle/schema.ts';
    const fs = require('fs');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // post_templatesテーブルが定義されていることを確認
    expect(schemaContent).toContain('post_templates');
    expect(schemaContent).toContain('instagramCaption');
    expect(schemaContent).toContain('xCaption');
    expect(schemaContent).toContain('threadsCaption');
    expect(schemaContent).toContain('defaultPostTime');
  });

  it('should have template CRUD functions in db.ts', () => {
    const dbPath = '/home/ubuntu/sns-automation-app/server/db.ts';
    const fs = require('fs');
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    
    // CRUD関数が定義されていることを確認
    expect(dbContent).toContain('getPostTemplatesByUserId');
    expect(dbContent).toContain('createPostTemplate');
    expect(dbContent).toContain('updatePostTemplate');
    expect(dbContent).toContain('deletePostTemplate');
  });

  it('should have template router in routers.ts', () => {
    const routersPath = '/home/ubuntu/sns-automation-app/server/routers.ts';
    const fs = require('fs');
    const routersContent = fs.readFileSync(routersPath, 'utf-8');
    
    // postTemplatesルーターが定義されていることを確認
    expect(routersContent).toContain('postTemplates');
    expect(routersContent).toContain('list');
    expect(routersContent).toContain('create');
    expect(routersContent).toContain('update');
    expect(routersContent).toContain('delete');
  });

  it('should have PostTemplates page component', () => {
    const postTemplatesPath = '/home/ubuntu/sns-automation-app/client/src/pages/PostTemplates.tsx';
    const fs = require('fs');
    
    // PostTemplates.tsxファイルが存在することを確認
    expect(fs.existsSync(postTemplatesPath)).toBe(true);
    
    const postTemplatesContent = fs.readFileSync(postTemplatesPath, 'utf-8');
    
    // 必要なコンポーネントが含まれていることを確認
    expect(postTemplatesContent).toContain('trpc.postTemplates.list');
    expect(postTemplatesContent).toContain('trpc.postTemplates.create');
    expect(postTemplatesContent).toContain('trpc.postTemplates.update');
    expect(postTemplatesContent).toContain('trpc.postTemplates.delete');
  });

  it('should have TemplateSelector component', () => {
    const templateSelectorPath = '/home/ubuntu/sns-automation-app/client/src/components/TemplateSelector.tsx';
    const fs = require('fs');
    
    // TemplateSelector.tsxファイルが存在することを確認
    expect(fs.existsSync(templateSelectorPath)).toBe(true);
    
    const templateSelectorContent = fs.readFileSync(templateSelectorPath, 'utf-8');
    
    // 必要な機能が含まれていることを確認
    expect(templateSelectorContent).toContain('trpc.postTemplates.list');
    expect(templateSelectorContent).toContain('onApplyTemplate');
    expect(templateSelectorContent).toContain('companyName');
  });

  it('should have template selection in Demo page', () => {
    const demoPath = '/home/ubuntu/sns-automation-app/client/src/pages/Demo.tsx';
    const fs = require('fs');
    const demoContent = fs.readFileSync(demoPath, 'utf-8');
    
    // Demo.tsxにTemplateSelector が統合されていることを確認
    expect(demoContent).toContain('TemplateSelector');
    expect(demoContent).toContain('handleApplyTemplate');
  });

  it('should have PostTemplates route in App.tsx', () => {
    const appPath = '/home/ubuntu/sns-automation-app/client/src/App.tsx';
    const fs = require('fs');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    
    // App.tsxにPostTemplatesルートが追加されていることを確認
    expect(appContent).toContain('PostTemplates');
    expect(appContent).toContain('/post-templates');
  });
});
