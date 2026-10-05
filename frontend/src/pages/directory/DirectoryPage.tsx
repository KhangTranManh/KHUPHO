import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconBox } from '@/components/ui/IconBox';
import { PageState } from '@/components/ui/PageState';
import { TextField } from '@/components/ui/TextField';
import { DIRECTORY_GROUPS, DIRECTORY_GROUP_ICON, DIRECTORY_GROUP_LABEL, DIRECTORY_GROUP_TONE } from '@/features/directory/constants';
import { getDirectory } from '@/features/directory/directoryService';
import { useAsync } from '@/hooks/useAsync';
import styles from './DirectoryPage.module.css';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Sổ tay phường — danh bạ hotline tổng hợp. Bấm số để gọi trên điện thoại. */
export function DirectoryPage() {
  const { data, error } = useAsync(getDirectory, []);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return (data ?? []).filter((h) => !q || normalize(`${h.unit} ${h.personInCharge ?? ''} ${h.phone}`).includes(q));
  }, [data, search]);

  if (!data) return <PageState error={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.searchRow}>
        <TextField icon="search" placeholder="Tìm đơn vị, chức danh, số điện thoại…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {DIRECTORY_GROUPS.map((group) => {
        const items = filtered.filter((h) => h.group === group);
        if (items.length === 0) return null;
        return (
          <Card
            key={group}
            title={
              <span className={styles.groupTitle}>
                <IconBox icon={DIRECTORY_GROUP_ICON[group]} tone={DIRECTORY_GROUP_TONE[group]} size="sm" />
                {DIRECTORY_GROUP_LABEL[group]}
              </span>
            }
          >
            <ul className={`${styles.grid} ${group === 'khan_cap' ? styles.emergency : ''}`}>
              {items.map((h) => (
                <li key={h.id} className={styles.item}>
                  <div className={styles.info}>
                    <strong>{h.unit}</strong>
                    {h.personInCharge && <span>{h.personInCharge}</span>}
                    {h.note && <small>{h.note}</small>}
                  </div>
                  <a href={`tel:${h.phone.replace(/\s/g, '')}`} className={`tone-${DIRECTORY_GROUP_TONE[group]} ${styles.call}`}>
                    <Icon name="phone" size={14} />
                    {h.phone}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {filtered.length === 0 && <p className={styles.empty}>Không tìm thấy số nào phù hợp.</p>}
    </div>
  );
}
