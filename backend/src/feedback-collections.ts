import type { CollectionConfig, Field } from 'payload';
import { audit, fail, hasRole } from './domain';

const never = () => false;
const manage = ({ req }: any) => hasRole(req.user, 'admin', 'editor');
const readonlyText = (name: string, label: string): Field => ({ name, label, type: 'text', required: true, admin: { readOnly: true } });
const immutable = ['receiptHash', 'publication', 'release', 'contentTitle', 'kind', 'slug', 'channel', 'category', 'message'];

export const Feedback: CollectionConfig = {
  slug: 'feedback', labels: { singular: '读者纠错', plural: '读者纠错队列' },
  admin: {
    useAsTitle: 'contentTitle', defaultColumns: ['contentTitle', 'category', 'status', 'assignedTo', 'createdAt'],
    description: '读者针对具体内容版本提交的问题。回复仅持查询码的读者可见；处理反馈不会自动修改、审校或发布医学内容。勿在回复中写入内部信息或个人诊疗建议。',
  },
  access: { create: never, read: manage, update: manage, delete: ({ req }) => hasRole(req.user, 'admin') },
  hooks: {
    beforeChange: [({ data, originalDoc, operation, req }) => {
      if (operation === 'create') {
        if (!req.context.internalFeedback) fail('纠错只接受公开表单提交。', 403);
        data.status = 'new'; data.publicReply = ''; data.internalNotes = ''; data.assignedTo = null;
      } else {
        for (const field of immutable) {
          const previous = originalDoc[field];
          const incoming = data[field];
          const value = (v: any) => v && typeof v === 'object' ? v.id : v;
          if (incoming !== undefined && value(incoming) !== value(previous)) fail('读者原始问题与内容版本不可修改。');
        }
        const merged = { ...originalDoc, ...data };
        if (['resolved', 'dismissed'].includes(merged.status) && !merged.publicReply?.trim()) fail('结束处理前请填写给读者的说明。');
      }
      return data;
    }],
    afterChange: [async ({ req, doc, operation }) => {
      if (operation === 'update') await audit(req, 'feedback-update', `feedback:${doc.id}`, `status=${doc.status}`);
    }],
    beforeDelete: [async ({ req, id }) => { await audit(req, 'feedback-delete', `feedback:${id}`, '删除纠错记录；审计不保留问题正文或查询码。'); }],
  },
  fields: [
    { name: 'receiptHash', type: 'text', required: true, unique: true, admin: { hidden: true }, access: { read: never } },
    readonlyText('contentTitle', '读者看到的标题'), readonlyText('kind', '内容类型'), readonlyText('slug', '内容标识'), readonlyText('channel', '发布集合'),
    { name: 'publication', label: '发布入口', type: 'relationship', relationTo: 'publications', required: true, admin: { readOnly: true } },
    { name: 'release', label: '读者报告的内容修订', type: 'relationship', relationTo: 'releases', required: true, admin: { readOnly: true } },
    { name: 'category', label: '问题类型', type: 'select', required: true, admin: { readOnly: true }, options: [
      { label: '内容可能有误', value: 'accuracy' }, { label: '来源链接或引用问题', value: 'source' },
      { label: '表达不易理解', value: 'clarity' }, { label: '页面使用问题', value: 'experience' },
    ] },
    { name: 'message', label: '读者原始描述', type: 'textarea', required: true, maxLength: 1500, admin: { readOnly: true } },
    { name: 'status', label: '处理状态', type: 'select', required: true, defaultValue: 'new', index: true, options: [
      { label: '已收到', value: 'new' }, { label: '处理中', value: 'triaging' }, { label: '等待专业复核', value: 'awaiting-review' },
      { label: '已处理', value: 'resolved' }, { label: '暂不调整（说明原因）', value: 'dismissed' },
    ] },
    { name: 'assignedTo', label: '处理负责人', type: 'relationship', relationTo: 'users' },
    { name: 'publicReply', label: '给读者的处理说明（持查询码可见）', type: 'textarea', maxLength: 2000 },
    { name: 'internalNotes', label: '内部备注（不公开）', type: 'textarea', maxLength: 4000 },
  ],
};

// Shared atomic counters; raw client IPs and receipt codes are never stored here.
export const FeedbackThrottles: CollectionConfig = {
  slug: 'feedback-throttles', admin: { hidden: true },
  access: { create: never, read: never, update: never, delete: never },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'hits', type: 'number', required: true },
    { name: 'resetAt', type: 'date', required: true, index: true },
  ],
};
