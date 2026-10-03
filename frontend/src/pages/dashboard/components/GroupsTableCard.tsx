import { AvatarGroup } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { CellStack, DataTable, type Column } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { IconBox } from '@/components/ui/IconBox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { GroupOverview } from '@/features/dashboard/types';
import { formatNumber } from '@/utils/format';
import styles from './GroupsTableCard.module.css';

/** Tổ coi là đã rà soát xong khi đạt ngưỡng này. */
const DONE_THRESHOLD = 90;

const columns: Column<GroupOverview>[] = [
  {
    key: 'name',
    header: 'Tổ dân phố',
    render: (g) => (
      <div className={styles.group}>
        <IconBox icon="mapPin" size="sm" tone="dark" />
        <CellStack primary={g.name} secondary={`Tổ trưởng: ${g.leaderName}`} />
      </div>
    ),
  },
  {
    key: 'officers',
    header: 'Cán bộ phụ trách',
    render: (g) => <AvatarGroup names={g.officers} />,
    hideOnMobile: true,
  },
  {
    key: 'households',
    header: 'Số hộ',
    align: 'center',
    render: (g) => <strong className={styles.num}>{formatNumber(g.households)}</strong>,
  },
  {
    key: 'residents',
    header: 'Nhân khẩu',
    align: 'center',
    render: (g) => <strong className={styles.num}>{formatNumber(g.residents)}</strong>,
    hideOnMobile: true,
  },
  {
    key: 'review',
    header: 'Rà soát',
    render: (g) => (
      <div className={styles.review}>
        <ProgressBar
          label={`${g.reviewProgress}%`}
          value={g.reviewProgress}
          tone={g.reviewProgress >= DONE_THRESHOLD ? 'success' : 'primary'}
        />
      </div>
    ),
  },
];

export function GroupsTableCard({ groups }: { groups: GroupOverview[] }) {
  const done = groups.filter((g) => g.reviewProgress >= DONE_THRESHOLD).length;

  return (
    <div id="ra-soat">
      <Card
        title="Tổ dân phố"
        subtitle={
          <span className={styles.subtitle}>
            <Icon name="checkCircle" size={14} />
            <strong>
              {done}/{groups.length} tổ
            </strong>{' '}
            đã hoàn thành rà soát
          </span>
        }
        flush
      >
        <DataTable columns={columns} rows={groups} rowKey={(g) => g.id} />
      </Card>
    </div>
  );
}
