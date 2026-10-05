import { useState } from 'react';
import { Tabs } from '@/components/ui/Tabs';
import { ActivitiesTab } from './components/ActivitiesTab';
import { CulturalFamiliesTab } from './components/CulturalFamiliesTab';
import { SurveysTab } from './components/SurveysTab';
import styles from './CommunityPage.module.css';

type Section = 'khao_sat' | 'sinh_hoat' | 'van_hoa';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'khao_sat', label: 'Khảo sát cư dân' },
  { value: 'sinh_hoat', label: 'Lịch sinh hoạt' },
  { value: 'van_hoa', label: 'Gia đình văn hoá' },
];

/** Khảo sát & sinh hoạt cộng đồng. */
export function CommunityPage() {
  const [section, setSection] = useState<Section>('khao_sat');

  return (
    <div className={styles.page}>
      <Tabs options={SECTIONS} value={section} onChange={setSection} />
      {section === 'khao_sat' && <SurveysTab />}
      {section === 'sinh_hoat' && <ActivitiesTab />}
      {section === 'van_hoa' && <CulturalFamiliesTab />}
    </div>
  );
}
