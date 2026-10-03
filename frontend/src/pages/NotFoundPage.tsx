import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/config/navigation';

export function NotFoundPage() {
  return (
    <Card title="Không tìm thấy trang">
      <p>
        Đường dẫn không tồn tại. <Link to={ROUTES.dashboard}>Quay về trang tổng quan</Link>.
      </p>
    </Card>
  );
}
