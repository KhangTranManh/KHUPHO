import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { PageState } from '@/components/ui/PageState';
import { StatCard } from '@/components/ui/StatCard';
import { ROUTES } from '@/config/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { getResidentDashboard } from '@/features/dashboard/dashboardService';
import { formatCurrency } from '@/features/funds/constants';
import { POST_CATEGORY_LABEL } from '@/features/posts/constants';
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE } from '@/features/reports/constants';
import {
  RESIDENCE_STATUS_LABEL,
  RESIDENCE_STATUS_TONE,
  RESIDENT_CATEGORY_LABEL,
  householdRoleText,
} from '@/features/residents/constants';
import { useAsync } from '@/hooks/useAsync';
import { ageFrom } from '@/utils/date';
import { formatDate, formatDateTime } from '@/utils/format';
import pageStyles from './DashboardPage.module.css';
import styles from './ResidentDashboard.module.css';

/** "Xem tất cả →" ở góc thẻ. */
function SeeAll({ to, label = 'Xem tất cả' }: { to: string; label?: string }) {
  return (
    <Link to={to} className={styles.seeAll}>
      {label} <Icon name="arrowRight" size={12} />
    </Link>
  );
}

/**
 * Dashboard cư dân: chỉ thông tin của chính mình và hộ mình — thông báo, phản ánh đã gửi,
 * quỹ cần đóng, khảo sát chờ trả lời — cùng lối tắt để phản hồi (phản ánh, SOS).
 */
export function ResidentDashboard() {
  const { user } = useAuth();
  const { data, error } = useAsync(getResidentDashboard, []);

  if (!data) return <PageState error={error} />;
  const h = data.household;

  return (
    <div className={pageStyles.page}>
      <section className={styles.welcome}>
        <div>
          <p className={styles.hello}>Xin chào,</p>
          <h4 className={styles.name}>{user?.fullName}</h4>
          <p className={styles.address}>
            {h ? (
              <>
                <Icon name="home" size={14} /> Hộ {h.code} · {h.address} · {h.areaName}
              </>
            ) : (
              'Tài khoản chưa liên kết với nhân khẩu — vui lòng liên hệ trưởng khu phố.'
            )}
          </p>
        </div>
        <div className={styles.quick}>
          <Link to={ROUTES.security} className={styles.quickBtn}>
            <Icon name="shield" size={16} /> Gửi phản ánh
          </Link>
          <Link to={ROUTES.sos} className={`${styles.quickBtn} ${styles.sosBtn}`}>
            <Icon name="siren" size={16} /> SOS
          </Link>
          <Link to={ROUTES.directory} className={styles.quickBtn}>
            <Icon name="phone" size={16} /> Sổ tay phường
          </Link>
        </div>
      </section>

      <div className={pageStyles.stats}>
        <StatCard label="Thông báo chưa đọc" icon="bell" tone="primary" value={data.unreadPostCount} />
        <StatCard label="Phản ánh đang xử lý" icon="shield" tone="warning" value={data.openReportCount} />
        <StatCard label="Quỹ chưa đóng" icon="wallet" tone="danger" value={data.unpaidFunds.length} />
        <StatCard label="Khảo sát chờ trả lời" icon="clipboard" tone="info" value={data.openSurveys.length} />
      </div>

      <div className={`${pageStyles.row} ${pageStyles.wideLeft}`}>
        <Card title="Hộ của tôi" subtitle={h ? `${h.memberCount} nhân khẩu` : undefined}>
          {!h ? (
            <p className={styles.empty}>Chưa có thông tin hộ.</p>
          ) : (
            <ul className={styles.list}>
              {h.members.map((m) => (
                <li key={m.id} className={styles.item}>
                  <div className={styles.body}>
                    <h6>{m.fullName}</h6>
                    <p>
                      {householdRoleText(m.householdRole, m.relationToHead)} · {ageFrom(m.dateOfBirth)} tuổi
                      {m.categories.length > 0 && ` · ${m.categories.map((c) => RESIDENT_CATEGORY_LABEL[c]).join(', ')}`}
                    </p>
                  </div>
                  <div className={styles.side}>
                    <Badge tone={RESIDENCE_STATUS_TONE[m.residenceStatus]}>{RESIDENCE_STATUS_LABEL[m.residenceStatus]}</Badge>
                    {m.residenceTo && <small>đến {formatDate(m.residenceTo)}</small>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Thông báo mới" action={<SeeAll to={ROUTES.posts} />}>
          {data.latestPosts.length === 0 ? (
            <p className={styles.empty}>Chưa có thông báo.</p>
          ) : (
            <ul className={styles.list}>
              {data.latestPosts.map((p) => (
                <li key={p.id} className={styles.item}>
                  {!p.isRead && <span className={styles.dot} aria-label="Chưa đọc" />}
                  <div className={styles.body}>
                    <h6>{p.title}</h6>
                    <p>
                      {POST_CATEGORY_LABEL[p.category]}
                      {p.eventDate && ` · ${formatDate(p.eventDate)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={`${pageStyles.row} ${pageStyles.wideRight}`}>
        <Card title="Phản ánh của tôi" action={<SeeAll to={ROUTES.security} />}>
          {data.myReports.length === 0 ? (
            <p className={styles.empty}>Bạn chưa gửi phản ánh nào.</p>
          ) : (
            <ul className={styles.list}>
              {data.myReports.map((r) => (
                <li key={r.id} className={styles.item}>
                  <div className={styles.body}>
                    <h6>{r.type === 'sos' ? 'SOS khẩn cấp' : r.title}</h6>
                    <p>
                      {r.code} · {formatDateTime(r.createdAt)}
                      {r.history.at(-1)?.note && ` · ${r.history.at(-1)!.note}`}
                    </p>
                  </div>
                  <Badge tone={REPORT_STATUS_TONE[r.status]}>{REPORT_STATUS_LABEL[r.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className={styles.stack}>
          <Card title="Quỹ cần đóng" action={<SeeAll to={ROUTES.funds} label="Mã QR" />}>
            {data.unpaidFunds.length === 0 ? (
              <p className={styles.done}>
                <Icon name="checkCircle" size={16} /> Hộ đã đóng đủ các quỹ đang thu.
              </p>
            ) : (
              <ul className={styles.list}>
                {data.unpaidFunds.map((f) => (
                  <li key={f.fundId} className={styles.item}>
                    <div className={styles.body}>
                      <h6>{f.name}</h6>
                      <p>{f.dueDate ? `Hạn đóng ${formatDate(f.dueDate)}` : 'Không có hạn'}</p>
                    </div>
                    <strong className={styles.amount}>{f.amountDue ? formatCurrency(f.amountDue) : 'Tự nguyện'}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Khảo sát & thông báo đến hộ" action={<SeeAll to={ROUTES.community} />}>
            <ul className={styles.list}>
              {data.openSurveys.map((s) => (
                <li key={s.id} className={styles.item}>
                  <Icon name="clipboard" size={16} />
                  <div className={styles.body}>
                    <h6>{s.title}</h6>
                    <p>Hạn trả lời {formatDate(s.endDate)}</p>
                  </div>
                </li>
              ))}
              {data.notifications.map((n) => (
                <li key={n.id} className={styles.item}>
                  <Icon name="bell" size={16} />
                  <div className={styles.body}>
                    <h6>{n.title}</h6>
                    <p>{n.body}</p>
                  </div>
                </li>
              ))}
              {data.openSurveys.length === 0 && data.notifications.length === 0 && (
                <li className={styles.empty}>Không có gì mới.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
