import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconBox } from '@/components/ui/IconBox';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { PageState } from '@/components/ui/PageState';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs, type TabOption } from '@/components/ui/Tabs';
import { useIsLeader } from '@/features/auth/useIsStaff';
import {
  POST_CATEGORY_ICON,
  POST_CATEGORY_LABEL,
  POST_CATEGORY_TONE,
  POST_KINDS,
  POST_KIND_LABEL,
} from '@/features/posts/constants';
import { getPosts, markPostRead } from '@/features/posts/postService';
import type { Post, PostKind } from '@/features/posts/types';
import { RESIDENT_CATEGORY_LABEL } from '@/features/residents/constants';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDate, formatDateTime } from '@/utils/format';
import { PostFormModal } from './components/PostFormModal';
import styles from './PostsPage.module.css';

const TABS: TabOption<PostKind | 'all'>[] = [
  { value: 'all', label: 'Tất cả' },
  ...POST_KINDS.map((k) => ({ value: k, label: POST_KIND_LABEL[k] })),
];

function audienceText(post: Post) {
  if (post.audience.scope === 'group') {
    return `Dành cho: ${(post.audience.categories ?? []).map((c) => RESIDENT_CATEGORY_LABEL[c]).join(', ')}`;
  }
  if (post.audience.scope === 'area') return 'Dành cho một số khu vực';
  return undefined;
}

function PostItem({ item, isLeader, onRead }: { item: Post; isLeader: boolean; onRead: (p: Post) => void }) {
  const meta = [
    item.eventDate && `${formatDate(item.eventDate)}${item.eventTime ? ` · ${item.eventTime}` : ''}`,
    item.location,
    audienceText(item),
  ].filter(Boolean);

  return (
    <article className={`${styles.item} ${item.pinned ? styles.pinned : ''} ${item.isRead ? '' : styles.unread}`}>
      <IconBox icon={POST_CATEGORY_ICON[item.category]} tone={POST_CATEGORY_TONE[item.category]} />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.category}>
            {POST_KIND_LABEL[item.kind]} · {POST_CATEGORY_LABEL[item.category]}
          </span>
          {item.pinned && <Badge tone="danger">Ghim</Badge>}
          {!item.isRead && <Badge tone="info">Mới</Badge>}
        </div>
        <h6 className={styles.title}>{item.title}</h6>
        {meta.length > 0 && (
          <p className={styles.meta}>
            <Icon name="calendar" size={12} /> {meta.join(' · ')}
          </p>
        )}
        <p className={styles.content}>{item.content}</p>
        {item.attachments.length > 0 && (
          <ul className={styles.attachments}>
            {item.attachments.map((a) => (
              <li key={a.url + a.name}>
                <a href={a.url} target="_blank" rel="noreferrer">
                  <Icon name="fileText" size={12} /> {a.name}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.footer}>
          {item.author.name} · {formatDateTime(item.publishedAt)}
          {isLeader && ` · ${item.readCount} lượt đã đọc`}
          {!item.isRead && (
            <button type="button" className={styles.readBtn} onClick={() => onRead(item)}>
              Đã xem
            </button>
          )}
        </p>
      </div>
    </article>
  );
}

/** Thông báo nhanh, tuyên truyền, sự kiện — cư dân chỉ thấy bài dành cho mình. */
export function PostsPage() {
  const isLeader = useIsLeader();
  const list = useListQuery(getPosts, { pageSize: 8 });
  const [creating, setCreating] = useState(false);

  const onRead = async (post: Post) => {
    await markPostRead(post.id);
    list.reload();
  };

  return (
    <Card
      title="Thông báo & tuyên truyền"
      subtitle={list.data && `${list.data.total} bài`}
      action={
        isLeader && (
          <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
            Đăng bài
          </Button>
        )
      }
      flush
    >
      <ListToolbar search={list.search} onSearch={list.setSearch} placeholder="Tìm tiêu đề, nội dung…">
        <Tabs options={TABS} value={list.filter} onChange={list.setFilter} />
      </ListToolbar>

      {!list.data ? (
        <PageState error={list.error} />
      ) : (
        <>
          <div className={`${styles.list} ${list.loading ? styles.loading : ''}`}>
            {list.data.items.length === 0 && <p className={styles.empty}>Chưa có bài nào.</p>}
            {list.data.items.map((item) => (
              <PostItem key={item.id} item={item} isLeader={isLeader} onRead={onRead} />
            ))}
          </div>
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onChange={list.setPage} />
        </>
      )}

      <PostFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          list.reload();
        }}
      />
    </Card>
  );
}
